import { withdrawStakeAll, withdrawStakeByPercent, withdrawStakeByValue } from '../src/staking.withdrawal.helpers'

// Minimal mock for auto-utils types consumed by parse.ts
jest.mock('@autonomys/auto-utils', () => ({
  __esModule: true,
  // Provide minimal placeholders for type-only imports
}))

// Mock position and staking modules
jest.mock('../src/position', () => ({
  __esModule: true,
  nominatorPosition: jest.fn(),
}))

jest.mock('../src/staking', () => ({
  __esModule: true,
  withdrawStake: jest.fn(({ api, operatorId, shares }) => ({ api, operatorId, shares })),
}))

const { nominatorPosition } = jest.requireMock('../src/position') as {
  nominatorPosition: jest.Mock
}
const { withdrawStake } = jest.requireMock('../src/staking') as {
  withdrawStake: jest.Mock
}

const api = {} as any

describe('staking.withdrawal.helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('withdrawStakeAll computes full shares and delegates', async () => {
    nominatorPosition.mockResolvedValue({ totalShares: 123n, currentStakedValue: 1000n })
    const res = await withdrawStakeAll({ api, operatorId: '1', account: 'acc' })
    expect(withdrawStake).toHaveBeenCalledWith({ api, operatorId: '1', shares: 123n })
    expect(res.shares).toBe(123n)
  })

  test('withdrawStakeAll throws when no shares', async () => {
    nominatorPosition.mockResolvedValue({ totalShares: 0n, currentStakedValue: 0n })
    await expect(
      withdrawStakeAll({ api, operatorId: '1', account: 'acc' }),
    ).rejects.toThrow('No shares to withdraw')
  })

  test('withdrawStakeByPercent clamps and floors shares', async () => {
    nominatorPosition.mockResolvedValue({ totalShares: 100n, currentStakedValue: 1000n })
    await withdrawStakeByPercent({ api, operatorId: 2, account: 'acc', percent: 25 })
    expect(withdrawStake).toHaveBeenCalledWith({ api, operatorId: 2, shares: 25n })

    // Over 100% clamps to 100%
    await withdrawStakeByPercent({ api, operatorId: 2, account: 'acc', percent: 150 })
    expect(withdrawStake).toHaveBeenLastCalledWith({ api, operatorId: 2, shares: 100n })

    // 0% should error
    await expect(
      withdrawStakeByPercent({ api, operatorId: 2, account: 'acc', percent: 0 }),
    ).rejects.toThrow('Calculated shares is zero')
  })

  test('withdrawStakeByValue computes shares proportional to value and floors', async () => {
    // totalShares = 1000, currentStakedValue = 500 (tokens)
    nominatorPosition.mockResolvedValue({ totalShares: 1000n, currentStakedValue: 500n })

    // Request 200 tokens -> shares = floor(200 * 1000 / 500) = 400
    await withdrawStakeByValue({ api, operatorId: '7', account: 'acc', amountToWithdraw: '200' })
    expect(withdrawStake).toHaveBeenCalledWith({ api, operatorId: '7', shares: 400n })

    // Request more than staked -> capped at full shares
    await withdrawStakeByValue({ api, operatorId: '7', account: 'acc', amountToWithdraw: '9999' })
    expect(withdrawStake).toHaveBeenLastCalledWith({ api, operatorId: '7', shares: 1000n })

    // Very small amount -> floor to 0 should error
    await expect(
      withdrawStakeByValue({ api, operatorId: '7', account: 'acc', amountToWithdraw: '0' }),
    ).rejects.toThrow('Calculated shares is zero')
  })

  test('withdrawStakeByValue throws when no stake', async () => {
    nominatorPosition.mockResolvedValue({ totalShares: 0n, currentStakedValue: 0n })
    await expect(
      withdrawStakeByValue({ api, operatorId: 1, account: 'acc', amountToWithdraw: 10 }),
    ).rejects.toThrow('No stake available')
  })
})