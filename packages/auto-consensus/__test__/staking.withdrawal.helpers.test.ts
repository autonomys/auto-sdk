import { ApiPromise } from '@autonomys/auto-utils'
import { withdrawStake } from '../src/staking/staking'
import {
  withdrawStakeAll,
  withdrawStakeByPercent,
  withdrawStakeByValue,
} from '../src/staking/withdrawal-helpers'

jest.mock('../src/position', () => ({
  nominatorPosition: jest.fn(),
}))

jest.mock('../src/staking/staking', () => ({
  withdrawStake: jest.fn(() => ({ hash: { toHex: () => '0xdeadbeef' } })),
}))

const { nominatorPosition } = jest.requireMock('../src/position') as {
  nominatorPosition: jest.Mock
}

const makeApi = (): unknown => ({}) as ApiPromise

describe('staking.withdrawal.helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('withdrawStakeAll uses totalShares', async () => {
    // storage fee deposit should be > 0 (e.g., ~20% of value at deposit time)
    nominatorPosition.mockResolvedValue({
      totalShares: BigInt(1234),
      currentStakedValue: BigInt(1000),
      storageFeeDeposit: { currentValue: BigInt(200), totalDeposited: BigInt(200) },
    })

    const api = makeApi()
    const tx: any = await withdrawStakeAll({ api: api as any, operatorId: '1', account: 'acc' })

    expect(withdrawStake).toHaveBeenCalledWith({ api, operatorId: '1', shares: BigInt(1234) })
    expect(tx.hash.toHex()).toBe('0xdeadbeef')
  })

  test('withdrawStakeAll errors when no shares', async () => {
    nominatorPosition.mockResolvedValue({
      totalShares: BigInt(0),
      currentStakedValue: BigInt(0),
      storageFeeDeposit: { currentValue: BigInt(0), totalDeposited: BigInt(0) },
    })

    const api = makeApi()
    await expect(
      withdrawStakeAll({ api: api as any, operatorId: '1', account: 'acc' }),
    ).rejects.toThrow(/No shares to withdraw/)
  })

  test('withdrawStakeByPercent clamps percent and floors shares', async () => {
    // Example with storage deposit ~20% of stake value
    nominatorPosition.mockResolvedValue({
      totalShares: BigInt(1000),
      currentStakedValue: BigInt(5000),
      storageFeeDeposit: { currentValue: BigInt(1000), totalDeposited: BigInt(1000) },
    })

    const api = makeApi()
    await withdrawStakeByPercent({
      api: api as any,
      operatorId: BigInt(2),
      account: 'acc',
      percent: 150,
    })

    // clamped to 100% => 1000n
    expect(withdrawStake).toHaveBeenCalledWith({ api, operatorId: BigInt(2), shares: BigInt(1000) })

    jest.clearAllMocks()
    await withdrawStakeByPercent({
      api: api as any,
      operatorId: BigInt(2),
      account: 'acc',
      percent: 33,
    })
    // floor(1000 * 33 / 100) = 330
    expect(withdrawStake).toHaveBeenCalledWith({ api, operatorId: BigInt(2), shares: BigInt(330) })
  })

  test('withdrawStakeByPercent errors for zero computed shares', async () => {
    nominatorPosition.mockResolvedValue({
      totalShares: BigInt(10),
      currentStakedValue: BigInt(1000),
      storageFeeDeposit: { currentValue: BigInt(200), totalDeposited: BigInt(200) },
    })

    const api = makeApi()
    await expect(
      withdrawStakeByPercent({ api: api as any, operatorId: '3', account: 'acc', percent: 0 }),
    ).rejects.toThrow(/Computed zero shares/)
  })

  test('withdrawStakeByValue caps to total payout value and floors shares', async () => {
    nominatorPosition.mockResolvedValue({
      totalShares: BigInt(1000),
      currentStakedValue: BigInt(5000),
      storageFeeDeposit: { currentValue: BigInt(1000), totalDeposited: BigInt(1000) },
    })

    const api = makeApi()
    await withdrawStakeByValue({
      api: api as any,
      operatorId: '4',
      account: 'acc',
      amountToWithdraw: 2500, // totalPayout=6000 => floor(2500*1000/6000)=416 shares
    })

    expect(withdrawStake).toHaveBeenCalledWith({ api, operatorId: '4', shares: BigInt(416) })

    jest.clearAllMocks()
    await withdrawStakeByValue({
      api: api as any,
      operatorId: '4',
      account: 'acc',
      amountToWithdraw: 999999999, // > totalPayout (6000) => capped to 6000
    })

    expect(withdrawStake).toHaveBeenCalledWith({ api, operatorId: '4', shares: BigInt(1000) })
  })

  test('withdrawStakeByValue validates inputs and errors on zero results', async () => {
    const api = makeApi()
    await expect(
      withdrawStakeByValue({
        api: api as any,
        operatorId: '5',
        account: 'acc',
        amountToWithdraw: 0,
      }),
    ).rejects.toThrow('amountToWithdraw must be greater than zero')

    nominatorPosition.mockResolvedValue({
      totalShares: BigInt(0),
      currentStakedValue: BigInt(1000),
      storageFeeDeposit: { currentValue: BigInt(0), totalDeposited: BigInt(0) },
    })
    await expect(
      withdrawStakeByValue({
        api: api as any,
        operatorId: '5',
        account: 'acc',
        amountToWithdraw: 1,
      }),
    ).rejects.toThrow(/No shares to withdraw/)

    nominatorPosition.mockResolvedValue({
      totalShares: BigInt(10),
      currentStakedValue: BigInt(0),
      storageFeeDeposit: { currentValue: BigInt(0), totalDeposited: BigInt(0) },
    })
    await expect(
      withdrawStakeByValue({
        api: api as any,
        operatorId: '5',
        account: 'acc',
        amountToWithdraw: 1,
      }),
    ).rejects.toThrow(/No redeemable value/)

    nominatorPosition.mockResolvedValue({
      totalShares: BigInt(10),
      currentStakedValue: BigInt(1000),
      storageFeeDeposit: { currentValue: BigInt(200), totalDeposited: BigInt(200) },
    })
    await expect(
      withdrawStakeByValue({
        api: api as any,
        operatorId: '5',
        account: 'acc',
        amountToWithdraw: 1,
      }),
    ).rejects.toThrow(/Computed zero shares/)
  })

  test('withdrawStakeByValue with storage fund gain (currentValue > totalDeposited)', async () => {
    // totalPayout = 5000 (stake) + 1500 (storage) = 6500
    // request 3250 => shares = floor(3250 * 1000 / 6500) = 500
    nominatorPosition.mockResolvedValue({
      totalShares: BigInt(1000),
      currentStakedValue: BigInt(5000),
      storageFeeDeposit: { currentValue: BigInt(1500), totalDeposited: BigInt(1000) },
    })

    const api = makeApi()
    await withdrawStakeByValue({
      api: api as any,
      operatorId: '6',
      account: 'acc',
      amountToWithdraw: 3250,
    })

    expect(withdrawStake).toHaveBeenCalledWith({ api, operatorId: '6', shares: BigInt(500) })
  })

  test('withdrawStakeByValue with storage fund loss (currentValue < totalDeposited)', async () => {
    // totalPayout = 5000 (stake) + 500 (storage) = 5500
    // request 2750 => shares = floor(2750 * 1000 / 5500) = 500
    nominatorPosition.mockResolvedValue({
      totalShares: BigInt(1000),
      currentStakedValue: BigInt(5000),
      storageFeeDeposit: { currentValue: BigInt(500), totalDeposited: BigInt(1000) },
    })

    const api = makeApi()
    await withdrawStakeByValue({
      api: api as any,
      operatorId: '7',
      account: 'acc',
      amountToWithdraw: 2750,
    })

    expect(withdrawStake).toHaveBeenCalledWith({ api, operatorId: '7', shares: BigInt(500) })
  })
})
