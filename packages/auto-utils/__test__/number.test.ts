import {
  formatSpacePledged,
  formatTokenAmount,
  parseTokenAmount,
} from '../src/number'

describe('number utilities', () => {
  describe('formatSpacePledged', () => {
    it('formats bytes, KiB, MiB, GiB, TiB, and EiB', () => {
      expect(formatSpacePledged(0n)).toBe('0 Bytes')
      expect(formatSpacePledged(1024n)).toBe('1.00 KiB')
      expect(formatSpacePledged(1610612736n, 3)).toBe('1.500 GiB')
      expect(formatSpacePledged(1099511627776n)).toBe('1.00 TiB')
      expect(formatSpacePledged(1152921504606846976n)).toBe('1.00 EiB')
    })

    it('handles negative or invalid values safely', () => {
      expect(formatSpacePledged(-1024n)).toBe('0 Bytes')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(formatSpacePledged(undefined as any)).toBe('0 Bytes')
    })

    it('clamps to highest available unit for extremely large sizes', () => {
      // 1024^9 bytes (larger than YiB)
      const hugeValue = 1024n ** 9n
      const formatted = formatSpacePledged(hugeValue)
      expect(formatted).toContain('YiB')
      expect(formatted).not.toContain('undefined')
    })
  })

  describe('parseTokenAmount & formatTokenAmount', () => {
    it('parses token amounts correctly for string and bigint', () => {
      expect(parseTokenAmount('1000000000000000000')).toBe(1)
      expect(parseTokenAmount('500000000000000000')).toBe(0.5)
      expect(parseTokenAmount(1000000000000000000n)).toBe(1n)
      expect(parseTokenAmount(1000000n, 6)).toBe(1n)
    })

    it('formats token amounts with exact BigInt power of 10 without precision degradation', () => {
      expect(formatTokenAmount(1.5)).toBe(1500000000000000000)
      expect(formatTokenAmount(10n)).toBe(10000000000000000000n)
      expect(formatTokenAmount(1n, 20)).toBe(100000000000000000000n)
      expect(formatTokenAmount(1n, 24)).toBe(1000000000000000000000000n)
    })
  })
})
