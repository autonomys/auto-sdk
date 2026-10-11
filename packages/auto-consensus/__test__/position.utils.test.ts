import { shareToStake, stakeToShare } from '../src/position/utils'

describe('Position utils in auto-consensus', () => {
  const ONE_E18 = BigInt('1000000000000000000') // 10^18

  describe('shareToStake', () => {
    it('converts shares to stake at 1:1 price ratio', () => {
      const shares = BigInt(1000)
      const price = ONE_E18
      const stake = shareToStake(shares, price)
      expect(stake).toBe(BigInt(1000))
    })

    it('converts shares to stake with a 2x price premium', () => {
      const shares = BigInt(1000)
      const price = ONE_E18 * BigInt(2)
      const stake = shareToStake(shares, price)
      expect(stake).toBe(BigInt(2000))
    })

    it('returns zero stake when shares is zero', () => {
      expect(shareToStake(BigInt(0), ONE_E18)).toBe(BigInt(0))
    })

    it('returns zero stake when price is zero', () => {
      expect(shareToStake(BigInt(1000), BigInt(0))).toBe(BigInt(0))
    })
  })

  describe('stakeToShare', () => {
    it('converts stake to shares at 1:1 price ratio', () => {
      const stake = BigInt(1000)
      const price = ONE_E18
      const shares = stakeToShare(stake, price)
      expect(shares).toBe(BigInt(1000))
    })

    it('converts stake to shares when share price is doubled', () => {
      const stake = BigInt(2000)
      const price = ONE_E18 * BigInt(2)
      const shares = stakeToShare(stake, price)
      expect(shares).toBe(BigInt(1000))
    })

    it('returns zero shares when stake is zero', () => {
      expect(stakeToShare(BigInt(0), ONE_E18)).toBe(BigInt(0))
    })

    it('throws error when share price is zero to avoid division by zero', () => {
      expect(() => stakeToShare(BigInt(1000), BigInt(0))).toThrow(
        'Price cannot be zero for stake to share conversion',
      )
    })
  })
})
