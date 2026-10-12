import {
  encodeAccountId32ToBytes32,
  getMinimumTransferAmount,
  isPrecompileDeployed,
  createTransferToConsensusTxData,
  transferToConsensus,
  getTransporterPrecompileAbi,
} from '../src/precompile/transporter'
import { TRANSPORTER_PRECOMPILE_ADDRESS, TRANSPORTER_PRECOMPILE_ABI } from '../src/precompile'
import type { EvmProvider, EvmSigner } from '../src/precompile/types'

describe('auto-xdm precompile', () => {
  const sampleSs58 = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'

  describe('encodeAccountId32ToBytes32', () => {
    it('should encode SS58 address into 32-byte 0x-prefixed hex string', () => {
      const bytes32 = encodeAccountId32ToBytes32(sampleSs58)
      expect(bytes32.startsWith('0x')).toBe(true)
      expect(bytes32).toHaveLength(66) // '0x' + 64 hex chars
    })
  })

  describe('createTransferToConsensusTxData', () => {
    it('should generate calldata with correct selector and destination address', () => {
      const amount = 1000000000000000000n
      const txData = createTransferToConsensusTxData(sampleSs58, amount)

      expect(txData.to).toBe(TRANSPORTER_PRECOMPILE_ADDRESS)
      expect(txData.data.startsWith('0xedcd6515')).toBe(true) // selector
      expect(txData.data).toHaveLength(10 + 64 + 64) // 0x + 8 selector + 64 account + 64 amount
    })

    it('should throw RangeError when amount is negative', () => {
      expect(() => {
        createTransferToConsensusTxData(sampleSs58, -100n)
      }).toThrow('Amount must be non-negative')
    })
  })

  describe('getMinimumTransferAmount', () => {
    it('should query provider and parse BigInt response', async () => {
      const mockProvider: EvmProvider = {
        call: jest.fn().mockResolvedValue('0x0de0b6b3a7640000'), // 1 AI3 in hex
      }

      const minAmount = await getMinimumTransferAmount(mockProvider)
      expect(mockProvider.call).toHaveBeenCalledWith({
        to: TRANSPORTER_PRECOMPILE_ADDRESS,
        data: '0x48a65e68',
      })
      expect(minAmount).toBe(1000000000000000000n)
    })
  })

  describe('isPrecompileDeployed', () => {
    it('should return true when provider call succeeds', async () => {
      const mockProvider: EvmProvider = {
        call: jest.fn().mockResolvedValue('0x10'),
      }

      const deployed = await isPrecompileDeployed(mockProvider)
      expect(deployed).toBe(true)
    })

    it('should return false when provider call throws', async () => {
      const mockProvider: EvmProvider = {
        call: jest.fn().mockRejectedValue(new Error('execution reverted')),
      }

      const deployed = await isPrecompileDeployed(mockProvider)
      expect(deployed).toBe(false)
    })
  })

  describe('transferToConsensus', () => {
    it('should throw RangeError for negative amounts', async () => {
      const mockSigner = {
        sendTransaction: jest.fn(),
      } as unknown as EvmSigner

      await expect(transferToConsensus(mockSigner, sampleSs58, -1n)).rejects.toThrow(
        'Amount must be non-negative',
      )
    })

    it('should return fire-and-forget result when confirmations is 0', async () => {
      const mockSigner: EvmSigner = {
        getAddress: jest.fn().mockResolvedValue('0x1234'),
        sendTransaction: jest.fn().mockResolvedValue({
          hash: '0xhash123',
          wait: jest.fn(),
        }),
      }

      const result = await transferToConsensus(mockSigner, sampleSs58, 1000n, {
        confirmations: 0,
      })

      expect(result.transactionHash).toBe('0xhash123')
      expect(result.blockNumber).toBe(0)
      expect(result.success).toBe(true)
    })

    it('should wait for confirmations and parse mined receipt', async () => {
      const mockReceipt = {
        blockNumber: 12345,
        blockHash: '0xblockhash',
        gasUsed: 21000n,
        effectiveGasPrice: 1000000000n,
        status: 1,
      }

      const mockWait = jest.fn().mockResolvedValue(mockReceipt)
      const mockSigner: EvmSigner = {
        getAddress: jest.fn().mockResolvedValue('0x1234'),
        sendTransaction: jest.fn().mockResolvedValue({
          hash: '0xtxhash',
          wait: mockWait,
        }),
      }

      const result = await transferToConsensus(mockSigner, sampleSs58, 500n, {
        confirmations: 1,
      })

      expect(mockWait).toHaveBeenCalledWith(1)
      expect(result.transactionHash).toBe('0xtxhash')
      expect(result.blockNumber).toBe(12345)
      expect(result.gasUsed).toBe(21000n)
      expect(result.success).toBe(true)
    })

    it('should report success: false when receipt status is 0', async () => {
      const mockReceipt = {
        blockNumber: 12346,
        blockHash: '0xfailedblock',
        gasUsed: 50000n,
        effectiveGasPrice: 1000000000n,
        status: 0,
      }

      const mockSigner: EvmSigner = {
        getAddress: jest.fn().mockResolvedValue('0x1234'),
        sendTransaction: jest.fn().mockResolvedValue({
          hash: '0xfailedhash',
          wait: jest.fn().mockResolvedValue(mockReceipt),
        }),
      }

      const result = await transferToConsensus(mockSigner, sampleSs58, 500n)
      expect(result.success).toBe(false)
    })

    it('should throw error if receipt is null', async () => {
      const mockSigner: EvmSigner = {
        getAddress: jest.fn().mockResolvedValue('0x1234'),
        sendTransaction: jest.fn().mockResolvedValue({
          hash: '0xdropped',
          wait: jest.fn().mockResolvedValue(null),
        }),
      }

      await expect(transferToConsensus(mockSigner, sampleSs58, 500n)).rejects.toThrow(
        'Transaction was dropped or replaced',
      )
    })
  })

  describe('getTransporterPrecompileAbi', () => {
    it('should return the precompile ABI array', () => {
      expect(getTransporterPrecompileAbi()).toEqual(TRANSPORTER_PRECOMPILE_ABI)
    })
  })
})
