import {
  formatSpaceToBinary,
  formatSpaceToBinaryAsObject,
  formatSpaceToDecimal,
  formatSpaceToDecimalAsObject,
} from '../src/utils/format'

describe('Verify consensus space formatting utilities', () => {
  describe('formatSpaceToBinaryAsObject', () => {
    test('formats zero bytes correctly', () => {
      expect(formatSpaceToBinaryAsObject(0)).toEqual({ value: 0, unit: 'Bytes' })
    })

    test('formats powers of 1024 with binary units', () => {
      expect(formatSpaceToBinaryAsObject(1024)).toEqual({ value: 1, unit: 'KiB' })
      expect(formatSpaceToBinaryAsObject(1024 * 1024)).toEqual({ value: 1, unit: 'MiB' })
      expect(formatSpaceToBinaryAsObject(1073741824)).toEqual({ value: 1, unit: 'GiB' })
      expect(formatSpaceToBinaryAsObject(1073741824 * 1024)).toEqual({ value: 1, unit: 'TiB' })
    })

    test('respects decimals parameter', () => {
      expect(formatSpaceToBinaryAsObject(1536, 1)).toEqual({ value: 1.5, unit: 'KiB' })
      expect(formatSpaceToBinaryAsObject(1536, 0)).toEqual({ value: 2, unit: 'KiB' })
      expect(formatSpaceToBinaryAsObject(1536, -1)).toEqual({ value: 2, unit: 'KiB' })
    })

    test('handles negative and non-finite inputs safely', () => {
      expect(formatSpaceToBinaryAsObject(-100)).toEqual({ value: 0, unit: 'Bytes' })
      expect(formatSpaceToBinaryAsObject(NaN)).toEqual({ value: 0, unit: 'Bytes' })
      expect(formatSpaceToBinaryAsObject(Infinity)).toEqual({ value: 0, unit: 'Bytes' })
      expect(formatSpaceToBinaryAsObject(-Infinity)).toEqual({ value: 0, unit: 'Bytes' })
    })

    test('clamps index to max unit without returning undefined', () => {
      const veryLarge = 1e30
      const result = formatSpaceToBinaryAsObject(veryLarge)
      expect(result.unit).toBe('YiB')
      expect(Number.isFinite(result.value)).toBe(true)
    })
  })

  describe('formatSpaceToDecimalAsObject', () => {
    test('formats zero bytes correctly', () => {
      expect(formatSpaceToDecimalAsObject(0)).toEqual({ value: 0, unit: 'Bytes' })
    })

    test('formats powers of 1000 with decimal units', () => {
      expect(formatSpaceToDecimalAsObject(1000)).toEqual({ value: 1, unit: 'KB' })
      expect(formatSpaceToDecimalAsObject(1000000)).toEqual({ value: 1, unit: 'MB' })
      expect(formatSpaceToDecimalAsObject(1000000000)).toEqual({ value: 1, unit: 'GB' })
    })

    test('respects decimals parameter', () => {
      expect(formatSpaceToDecimalAsObject(1500, 1)).toEqual({ value: 1.5, unit: 'KB' })
      expect(formatSpaceToDecimalAsObject(1500, 0)).toEqual({ value: 2, unit: 'KB' })
    })

    test('handles negative and non-finite inputs safely', () => {
      expect(formatSpaceToDecimalAsObject(-100)).toEqual({ value: 0, unit: 'Bytes' })
      expect(formatSpaceToDecimalAsObject(NaN)).toEqual({ value: 0, unit: 'Bytes' })
      expect(formatSpaceToDecimalAsObject(Infinity)).toEqual({ value: 0, unit: 'Bytes' })
    })

    test('clamps index to max unit without returning undefined', () => {
      const veryLarge = 1e30
      const result = formatSpaceToDecimalAsObject(veryLarge)
      expect(result.unit).toBe('YB')
      expect(Number.isFinite(result.value)).toBe(true)
    })
  })

  describe('formatSpaceToBinary', () => {
    test('formats binary strings correctly', () => {
      expect(formatSpaceToBinary(0)).toBe('0 Bytes')
      expect(formatSpaceToBinary(1024)).toBe('1 KiB')
      expect(formatSpaceToBinary(1073741824)).toBe('1 GiB')
      expect(formatSpaceToBinary(1536, 1)).toBe('1.5 KiB')
    })

    test('returns "0 Bytes" for invalid or negative inputs', () => {
      expect(formatSpaceToBinary(-1024)).toBe('0 Bytes')
      expect(formatSpaceToBinary(NaN)).toBe('0 Bytes')
      expect(formatSpaceToBinary(Infinity)).toBe('0 Bytes')
    })
  })

  describe('formatSpaceToDecimal', () => {
    test('formats decimal strings correctly', () => {
      expect(formatSpaceToDecimal(0)).toBe('0 Bytes')
      expect(formatSpaceToDecimal(1000)).toBe('1 KB')
      expect(formatSpaceToDecimal(1000000000)).toBe('1 GB')
      expect(formatSpaceToDecimal(1500, 1)).toBe('1.5 KB')
    })

    test('returns "0 Bytes" for invalid or negative inputs', () => {
      expect(formatSpaceToDecimal(-500)).toBe('0 Bytes')
      expect(formatSpaceToDecimal(NaN)).toBe('0 Bytes')
      expect(formatSpaceToDecimal(Infinity)).toBe('0 Bytes')
    })
  })
})
