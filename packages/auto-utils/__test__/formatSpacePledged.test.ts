import { formatSpacePledged, formatTokenAmount, parseTokenAmount } from '../src/number'

describe('Number and Space Pledged utilities', () => {
  describe('formatSpacePledged', () => {
    test('returns 0 Bytes for zero or negative values', () => {
      expect(formatSpacePledged(0n)).toBe('0 Bytes')
      expect(formatSpacePledged(-1n)).toBe('0 Bytes')
      expect(formatSpacePledged(-1024n)).toBe('0 Bytes')
    })

    test('returns 0 Bytes for non-bigint inputs', () => {
      // @ts-expect-error testing runtime robustness
      expect(formatSpacePledged(null)).toBe('0 Bytes')
      // @ts-expect-error testing runtime robustness
      expect(formatSpacePledged(undefined)).toBe('0 Bytes')
      // @ts-expect-error testing runtime robustness
      expect(formatSpacePledged(1024)).toBe('0 Bytes')
      // @ts-expect-error testing runtime robustness
      expect(formatSpacePledged('1024')).toBe('0 Bytes')
    })

    test('formats values under 1 KiB as Bytes', () => {
      expect(formatSpacePledged(500n)).toBe('500.00 Bytes')
      expect(formatSpacePledged(1n)).toBe('1.00 Bytes')
    })

    test('formats standard binary units correctly', () => {
      const oneKiB = 1024n
      expect(formatSpacePledged(oneKiB)).toBe('1.00 KiB')

      const oneMiB = oneKiB * 1024n
      expect(formatSpacePledged(oneMiB)).toBe('1.00 MiB')

      const oneGiB = oneMiB * 1024n
      expect(formatSpacePledged(oneGiB)).toBe('1.00 GiB')

      const oneTiB = oneGiB * 1024n
      expect(formatSpacePledged(oneTiB)).toBe('1.00 TiB')

      const onePiB = oneTiB * 1024n
      expect(formatSpacePledged(onePiB)).toBe('1.00 PiB')

      const oneEiB = onePiB * 1024n
      expect(formatSpacePledged(oneEiB)).toBe('1.00 EiB')
    })

    test('formats fractional units with custom decimal places', () => {
      const space = 1610612736n // 1.5 GiB
      expect(formatSpacePledged(space, 1)).toBe('1.5 GiB')
      expect(formatSpacePledged(space, 3)).toBe('1.500 GiB')
      expect(formatSpacePledged(space, 0)).toBe('2 GiB')
      expect(formatSpacePledged(space, -1)).toBe('2 GiB') // negative decimals clamped to 0
    })

    test('clamps unit index to maximum unit without returning undefined', () => {
      // Very large bigint exceeding YiB (1024^8)
      const huge = 1024n ** 9n * 5n
      const formatted = formatSpacePledged(huge)
      expect(formatted).not.toContain('undefined')
      expect(formatted.endsWith('YiB')).toBe(true)
    })
  })

  describe('parseTokenAmount', () => {
    test('parses string token amounts with default 18 decimals to number', () => {
      expect(parseTokenAmount('1000000000000000000')).toBe(1)
      expect(parseTokenAmount('500000000000000000')).toBe(0.5)
    })

    test('parses BigInt token amounts to BigInt', () => {
      expect(parseTokenAmount(1000000000000000000n)).toBe(1n)
      expect(parseTokenAmount(2000000000000000000n)).toBe(2n)
    })

    test('supports custom decimal precision', () => {
      expect(parseTokenAmount('1000000', 6)).toBe(1)
      expect(parseTokenAmount(1000000n, 6)).toBe(1n)
    })
  })

  describe('formatTokenAmount', () => {
    test('formats number token amounts to smallest units as number', () => {
      expect(formatTokenAmount(1)).toBe(1000000000000000000)
      expect(formatTokenAmount(1.5)).toBe(1500000000000000000)
    })

    test('formats BigInt token amounts to smallest units as BigInt', () => {
      expect(formatTokenAmount(1n)).toBe(1000000000000000000n)
      expect(formatTokenAmount(10n)).toBe(10000000000000000000n)
    })

    test('supports custom decimal precision', () => {
      expect(formatTokenAmount(100, 6)).toBe(100000000)
      expect(formatTokenAmount(100n, 6)).toBe(100000000n)
    })
  })
})
