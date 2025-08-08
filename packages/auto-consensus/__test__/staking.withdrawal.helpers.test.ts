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

jest.mock('../src/staking', () => ({
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
    nominatorPosition.mockResolvedValue({ totalShares: BigInt(1234), currentStakedValue: BigInt(999) })

    const api = makeApi()
    const tx: any = await withdrawStakeAll({ api: api as any, operatorId: '1', account: 'acc' })

    expect(withdrawStake).toHaveBeenCalledWith({ api, operatorId: '1', shares: BigInt(1234) })
    expect(tx.hash.toHex()).toBe('0xdeadbeef')
  })

  test('withdrawStakeAll errors when no shares', async () => {
    nominatorPosition.mockResolvedValue({ totalShares: BigInt(0), currentStakedValue: BigInt(0) })

    const api = makeApi()
    await expect(
      withdrawStakeAll({ api: api as any, operatorId: '1', account: 'acc' }),
    ).rejects.toThrow('No shares to withdraw')
  })

  test('withdrawStakeByPercent clamps percent and floors shares', async () => {
    nominatorPosition.mockResolvedValue({ totalShares: BigInt(1000), currentStakedValue: BigInt(5000) })

    const api = makeApi()
    await withdrawStakeByPercent({ api: api as any, operatorId: BigInt(2), account: 'acc', percent: 150 })

    // clamped to 100% => 1000n
    expect(withdrawStake).toHaveBeenCalledWith({ api, operatorId: BigInt(2), shares: BigInt(1000) })

    jest.clearAllMocks()
    await withdrawStakeByPercent({ api: api as any, operatorId: BigInt(2), account: 'acc', percent: 33 })
    // floor(1000 * 33 / 100) = 330
    expect(withdrawStake).toHaveBeenCalledWith({ api, operatorId: BigInt(2), shares: BigInt(330) })
  })

  test('withdrawStakeByPercent errors for zero computed shares', async () => {
    nominatorPosition.mockResolvedValue({ totalShares: BigInt(10), currentStakedValue: BigInt(1000) })

    const api = makeApi()
    await expect(
      withdrawStakeByPercent({ api: api as any, operatorId: '3', account: 'acc', percent: 0 }),
    ).rejects.toThrow('Computed zero shares')
  })

  test('withdrawStakeByValue caps to current value and floors shares', async () => {
    nominatorPosition.mockResolvedValue({ totalShares: BigInt(1000), currentStakedValue: BigInt(5000) })

    const api = makeApi()
    await withdrawStakeByValue({
      api: api as any,
      operatorId: '4',
      account: 'acc',
      amountToWithdraw: 2500, // half the value => 500 shares
    })

    expect(withdrawStake).toHaveBeenCalledWith({ api, operatorId: '4', shares: BigInt(500) })

    jest.clearAllMocks()
    await withdrawStakeByValue({
      api: api as any,
      operatorId: '4',
      account: 'acc',
      amountToWithdraw: 999999999, // > current value => capped to 5000
    })

    expect(withdrawStake).toHaveBeenCalledWith({ api, operatorId: '4', shares: BigInt(1000) })
  })

  test('withdrawStakeByValue validates inputs and errors on zero results', async () => {
    const api = makeApi()
    await expect(
      withdrawStakeByValue({ api: api as any, operatorId: '5', account: 'acc', amountToWithdraw: 0 }),
    ).rejects.toThrow('amountToWithdraw must be greater than zero')

    nominatorPosition.mockResolvedValue({ totalShares: BigInt(0), currentStakedValue: BigInt(1000) })
    await expect(
      withdrawStakeByValue({ api: api as any, operatorId: '5', account: 'acc', amountToWithdraw: 1 }),
    ).rejects.toThrow('No shares to withdraw')

    nominatorPosition.mockResolvedValue({ totalShares: BigInt(10), currentStakedValue: BigInt(0) })
    await expect(
      withdrawStakeByValue({ api: api as any, operatorId: '5', account: 'acc', amountToWithdraw: 1 }),
    ).rejects.toThrow('Current staked value is zero')

    nominatorPosition.mockResolvedValue({ totalShares: BigInt(10), currentStakedValue: BigInt(1000) })
    await expect(
      withdrawStakeByValue({ api: api as any, operatorId: '5', account: 'acc', amountToWithdraw: 1 }),
    ).rejects.toThrow('Computed zero shares')
  })
})