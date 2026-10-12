import type { ApiPromise } from '@autonomys/auto-utils'
import { initiateChannel, closeChannel } from '../src/messenger'
import { chainToChainIdCodec } from '../src/transforms'

jest.mock('../src/transforms', () => ({
  chainToChainIdCodec: jest.fn().mockReturnValue('mock-chain-id-codec'),
}))

describe('auto-xdm messenger', () => {
  const mockInitiateTx = { hash: '0xinitiate' }
  const mockCloseTx = { hash: '0xclose' }

  const mockApi = {
    createType: jest.fn().mockReturnValue('u256-codec'),
    tx: {
      messenger: {
        initiateChannel: jest.fn().mockReturnValue(mockInitiateTx),
        closeChannel: jest.fn().mockReturnValue(mockCloseTx),
      },
    },
  } as unknown as ApiPromise

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should create initiateChannel transaction for consensus', () => {
    const tx = initiateChannel(mockApi, 'consensus')
    expect(chainToChainIdCodec).toHaveBeenCalledWith(mockApi, 'consensus')
    expect(mockApi.tx.messenger.initiateChannel).toHaveBeenCalledWith('mock-chain-id-codec')
    expect(tx).toBe(mockInitiateTx)
  })

  it('should create initiateChannel transaction for domain', () => {
    const tx = initiateChannel(mockApi, { domainId: 0 })
    expect(chainToChainIdCodec).toHaveBeenCalledWith(mockApi, { domainId: 0 })
    expect(mockApi.tx.messenger.initiateChannel).toHaveBeenCalledWith('mock-chain-id-codec')
    expect(tx).toBe(mockInitiateTx)
  })

  it('should create closeChannel transaction with U256 channelId', () => {
    const tx = closeChannel(mockApi, { domainId: 1 }, 2)
    expect(chainToChainIdCodec).toHaveBeenCalledWith(mockApi, { domainId: 1 })
    expect(mockApi.createType).toHaveBeenCalledWith('U256', 2)
    expect(mockApi.tx.messenger.closeChannel).toHaveBeenCalledWith(
      'mock-chain-id-codec',
      'u256-codec',
    )
    expect(tx).toBe(mockCloseTx)
  })
})
