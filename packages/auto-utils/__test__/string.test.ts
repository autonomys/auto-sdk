import { shortString } from '../src/string'

describe('Verify shortString function', () => {
  const address = '5GmS1wtCfR4tK5SSgnZbVT4kYw5W8NmxmijcsxCQE6oLW6A8'
  const hash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'

  test('truncates standard address with default lengths (6, -4)', () => {
    expect(shortString(address)).toBe('5GmS1w...W6A8')
  })

  test('truncates hash with custom lengths (10, -8)', () => {
    expect(shortString(hash, 10, -8)).toBe('0x12345678...90abcdef')
  })

  test('handles positive endLength as suffix length', () => {
    expect(shortString(address, 6, 4)).toBe('5GmS1w...W6A8')
  })

  test('returns original string when length is less than or equal to initialLength + endLength', () => {
    expect(shortString('hello')).toBe('hello')
    expect(shortString('1234567890')).toBe('1234567890')
    expect(shortString('abc', 6, -4)).toBe('abc')
  })

  test('truncates string when length is strictly greater than initialLength + endLength', () => {
    expect(shortString('12345678901')).toBe('123456...8901')
  })

  test('returns empty string for empty input', () => {
    expect(shortString('')).toBe('')
  })

  test('handles endLength of 0 without error', () => {
    expect(shortString('1234567890', 5, 0)).toBe('12345...')
  })
})
