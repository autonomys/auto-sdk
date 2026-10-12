import type { Api } from '@autonomys/auto-utils'
import {
  convertRuntimePosition,
  createEmptyPosition,
  instantSharePrice,
  nominatorPosition,
  operatorEpochSharePrice,
  shareToStake,
  stakeToShare,
} from '../src/position'

jest.mock('../src/domain', () => ({
  domainStakingSummary: jest.fn(),
}))

jest.mock('../src/staking/staking', () => ({
  operator: jest.fn(),
}))

jest.mock('../src/utils/storage', () => ({
  getOperatorEpochSharePrice: jest.fn(),
}))

const { domainStakingSummary } = jest.requireMock('../src/domain') as {
  domainStakingSummary: jest.Mock
}
const { operator } = jest.requireMock('../src/staking/staking') as {
  operator: jest.Mock
}
const { getOperatorEpochSharePrice } = jest.requireMock('../src/utils/storage') as {
  getOperatorEpochSharePrice: jest.Mock
}

describe('position module unit tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createEmptyPosition', () => {
    it('returns an empty position with zeroed values', () => {
      const empty = createEmptyPosition()
      expect(empty).toEqual({
        currentStakedValue: BigInt(0),
        totalShares: BigInt(0),
        storageFeeDeposit: {
          totalDeposited: BigInt(0),
          currentValue: BigInt(0),
        },
        pendingDeposit: null,
        pendingWithdrawals: [],
      })
    })
  })

  describe('convertRuntimePosition', () => {
    it('converts complete runtime position data accurately', () => {
      const runtimeData = {
        currentStakedValue: { toString: () => '5000000000000000000' },
        totalShares: { toString: () => '2500000000000000000' },
        storageFeeDeposit: {
          totalDeposited: { toString: () => '1000000000000000000' },
          currentValue: { toString: () => '950000000000000000' },
        },
        pendingDeposit: {
          isSome: true,
          isNone: false,
          unwrap: () => ({
            amount: { toString: () => '100000000000000000' },
            effectiveEpoch: { toNumber: () => 42 },
          }),
        },
        pendingWithdrawals: [
          {
            stakeWithdrawalAmount: { toString: () => '200000000000000000' },
            storageFeeRefund: { toString: () => '50000000000000000' },
            unlockAtBlock: { toNumber: () => 12345 },
          },
        ],
      }

      const converted = convertRuntimePosition(runtimeData)
      expect(converted).toEqual({
        currentStakedValue: BigInt('5000000000000000000'),
        totalShares: BigInt('2500000000000000000'),
        storageFeeDeposit: {
          totalDeposited: BigInt('1000000000000000000'),
          currentValue: BigInt('950000000000000000'),
        },
        pendingDeposit: {
          amount: BigInt('100000000000000000'),
          effectiveEpoch: 42,
        },
        pendingWithdrawals: [
          {
            stakeWithdrawalAmount: BigInt('200000000000000000'),
            storageFeeRefund: BigInt('50000000000000000'),
            unlockAtBlock: 12345,
          },
        ],
      })
    })

    it('handles pendingDeposit with isSome: false', () => {
      const runtimeData = {
        currentStakedValue: { toString: () => '100' },
        totalShares: { toString: () => '50' },
        storageFeeDeposit: {
          totalDeposited: { toString: () => '10' },
          currentValue: { toString: () => '10' },
        },
        pendingDeposit: {
          isSome: false,
          isNone: true,
          unwrap: () => {
            throw new Error('None')
          },
        },
        pendingWithdrawals: [],
      }

      const converted = convertRuntimePosition(runtimeData)
      expect(converted.pendingDeposit).toBeNull()
      expect(converted.pendingWithdrawals).toEqual([])
    })
  })

  describe('nominatorPosition', () => {
    it('returns converted position when runtime position exists', async () => {
      const mockRuntimePos = {
        currentStakedValue: { toString: () => '1000' },
        totalShares: { toString: () => '500' },
        storageFeeDeposit: {
          totalDeposited: { toString: () => '200' },
          currentValue: { toString: () => '200' },
        },
        pendingDeposit: { isSome: false, isNone: true, unwrap: jest.fn() },
        pendingWithdrawals: [],
      }

      const mockApi = {
        call: {
          domainsApi: {
            nominatorPosition: jest.fn().mockResolvedValue({
              isNone: false,
              unwrap: () => mockRuntimePos,
            }),
          },
        },
      } as unknown as Api

      const result = await nominatorPosition(
        mockApi,
        '1',
        '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      )
      expect(result.currentStakedValue).toBe(BigInt(1000))
      expect(result.totalShares).toBe(BigInt(500))
      expect(mockApi.call.domainsApi.nominatorPosition).toHaveBeenCalledWith(
        '1',
        '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      )
    })

    it('returns empty position when position.isNone is true', async () => {
      const mockApi = {
        call: {
          domainsApi: {
            nominatorPosition: jest.fn().mockResolvedValue({
              isNone: true,
            }),
          },
        },
      } as unknown as Api

      const result = await nominatorPosition(mockApi, BigInt(2), 'account123')
      expect(result).toEqual(createEmptyPosition())
    })

    it('throws when runtime API domainsApi.nominatorPosition is missing', async () => {
      const mockApi = {
        call: {},
      } as unknown as Api

      await expect(nominatorPosition(mockApi, '1', 'account123')).rejects.toThrow(
        /Runtime API domainsApi\.nominatorPosition is not available/,
      )
    })

    it('wraps and rethrows errors when runtime query fails', async () => {
      const mockApi = {
        call: {
          domainsApi: {
            nominatorPosition: jest.fn().mockRejectedValue(new Error('RPC network timeout')),
          },
        },
      } as unknown as Api

      await expect(nominatorPosition(mockApi, '1', 'account123')).rejects.toThrow(
        /Error fetching position for nominator account123 in operator 1/,
      )
    })
  })

  describe('shareToStake & stakeToShare', () => {
    const onePerquintill = BigInt('1000000000000000000')

    it('converts shares to stake correctly', () => {
      const shares = BigInt(1000)
      const price = onePerquintill // price = 1.0
      expect(shareToStake(shares, price)).toBe(BigInt(1000))

      const doublePrice = BigInt(2) * onePerquintill // price = 2.0
      expect(shareToStake(shares, doublePrice)).toBe(BigInt(2000))
    })

    it('throws when shares or price is negative in shareToStake', () => {
      expect(() => shareToStake(BigInt(-10), onePerquintill)).toThrow(/Shares cannot be negative/)
      expect(() => shareToStake(BigInt(10), BigInt(-1))).toThrow(/Price cannot be negative/)
    })

    it('converts stake to shares correctly', () => {
      const stake = BigInt(2000)
      const price = BigInt(2) * onePerquintill // price = 2.0
      expect(stakeToShare(stake, price)).toBe(BigInt(1000))
    })

    it('throws when stake is negative in stakeToShare', () => {
      expect(() => stakeToShare(BigInt(-50), onePerquintill)).toThrow(/Stake cannot be negative/)
    })

    it('throws when price is zero or negative in stakeToShare', () => {
      expect(() => stakeToShare(BigInt(100), BigInt(0))).toThrow(/Price must be greater than zero/)
      expect(() => stakeToShare(BigInt(100), BigInt(-10))).toThrow(
        /Price must be greater than zero/,
      )
    })
  })

  describe('operatorEpochSharePrice', () => {
    const onePerquintill = BigInt('1000000000000000000')

    it('calculates inverted share price correctly', async () => {
      const mockApi = {} as Api
      getOperatorEpochSharePrice.mockResolvedValue(onePerquintill)

      const result = await operatorEpochSharePrice(mockApi, '1', 100, 0)
      expect(result).toBe(onePerquintill)
    })

    it('calculates inverted share price for custom value', async () => {
      const mockApi = {} as Api
      getOperatorEpochSharePrice.mockResolvedValue(BigInt('500000000000000000'))

      const result = await operatorEpochSharePrice(mockApi, '1', 100, 0)
      expect(result).toBe(BigInt('2000000000000000000'))
    })

    it('returns undefined if sharePrice is undefined or non-positive', async () => {
      const mockApi = {} as Api
      getOperatorEpochSharePrice.mockResolvedValue(undefined)
      expect(await operatorEpochSharePrice(mockApi, '1', 100, 0)).toBeUndefined()

      getOperatorEpochSharePrice.mockResolvedValue(BigInt(0))
      expect(await operatorEpochSharePrice(mockApi, '1', 100, 0)).toBeUndefined()

      getOperatorEpochSharePrice.mockResolvedValue(BigInt(-5))
      expect(await operatorEpochSharePrice(mockApi, '1', 100, 0)).toBeUndefined()
    })

    it('wraps and rethrows errors on failure', async () => {
      const mockApi = {} as Api
      getOperatorEpochSharePrice.mockRejectedValue(new Error('Storage decode error'))

      await expect(operatorEpochSharePrice(mockApi, '1', 100, 0)).rejects.toThrow(
        /Error fetching share price for operator 1 at epoch 100/,
      )
    })
  })

  describe('instantSharePrice', () => {
    const onePerquintill = BigInt('1000000000000000000')

    it('calculates real-time share price with stake and rewards', async () => {
      const mockApi = {} as Api

      operator.mockResolvedValue({
        currentTotalStake: BigInt(10000),
        currentTotalShares: BigInt(10000),
        nominationTax: 10,
        currentDomainId: BigInt(0),
      })

      domainStakingSummary.mockResolvedValue({
        domainId: '0',
        currentEpochRewards: {
          '1': '1000',
        },
      })

      const price = await instantSharePrice(mockApi, '1')
      expect(price).toBe((BigInt(10900) * onePerquintill) / BigInt(10000))
    })

    it('returns 1.0 in Perquintill format if totalShares is 0 or negative', async () => {
      const mockApi = {} as Api

      operator.mockResolvedValue({
        currentTotalStake: BigInt(0),
        currentTotalShares: BigInt(0),
        nominationTax: 5,
        currentDomainId: BigInt(0),
      })

      domainStakingSummary.mockResolvedValue({
        domainId: '0',
        currentEpochRewards: {},
      })

      const price = await instantSharePrice(mockApi, '1')
      expect(price).toBe(onePerquintill)
    })

    it('clamps nomination tax out of [0, 100] range', async () => {
      const mockApi = {} as Api

      operator.mockResolvedValue({
        currentTotalStake: BigInt(1000),
        currentTotalShares: BigInt(1000),
        nominationTax: 150,
        currentDomainId: BigInt(0),
      })

      domainStakingSummary.mockResolvedValue({
        domainId: '0',
        currentEpochRewards: {
          '1': '200',
        },
      })

      const price = await instantSharePrice(mockApi, '1')
      expect(price).toBe(onePerquintill)
    })

    it('throws error when domain staking summary is missing', async () => {
      const mockApi = {} as Api

      operator.mockResolvedValue({
        currentTotalStake: BigInt(1000),
        currentTotalShares: BigInt(1000),
        nominationTax: 10,
        currentDomainId: BigInt(0),
      })

      domainStakingSummary.mockResolvedValue(undefined)

      await expect(instantSharePrice(mockApi, '1')).rejects.toThrow(
        /No staking summary found for domain 0/,
      )
    })
  })
})
