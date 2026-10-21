import {
  capitalizeFirstLetter,
  fixLengthEntryId,
  shortString,
  stringify,
} from '../src/string'

describe('string utilities', () => {
  describe('shortString', () => {
    it('truncates longer strings with ellipsis', () => {
      const address = '5GmS1wtCfR4tK5SSgnZbVT4kYw5W8NmxmijcsxCQE6oLW6A8'
      expect(shortString(address)).toBe('5GmS1w...W6A8')
      expect(shortString(address, 8, -6)).toBe('5GmS1wtC...oLW6A8')
    })

    it('returns empty string if value is empty or falsy', () => {
      expect(shortString('')).toBe('')
    })

    it('returns original string without duplication if length is within bounds', () => {
      expect(shortString('short')).toBe('short')
      expect(shortString('hello', 6, -4)).toBe('hello')
      expect(shortString('1234567890', 6, -4)).toBe('1234567890')
    })

    it('normalizes positive endLength parameter', () => {
      const address = '5GmS1wtCfR4tK5SSgnZbVT4kYw5W8NmxmijcsxCQE6oLW6A8'
      expect(shortString(address, 6, 4)).toBe('5GmS1w...W6A8')
    })
  })

  describe('capitalizeFirstLetter', () => {
    it('capitalizes the first letter of words', () => {
      expect(capitalizeFirstLetter('mainnet')).toBe('Mainnet')
      expect(capitalizeFirstLetter('taurus')).toBe('Taurus')
      expect(capitalizeFirstLetter('a')).toBe('A')
    })

    it('handles empty strings and already capitalized strings', () => {
      expect(capitalizeFirstLetter('')).toBe('')
      expect(capitalizeFirstLetter('Mainnet')).toBe('Mainnet')
    })
  })

  describe('fixLengthEntryId', () => {
    it('pads block height to 32 digits', () => {
      expect(fixLengthEntryId(12345n)).toBe('00000000000000000000000000012345')
    })

    it('includes padded transaction index when provided', () => {
      expect(fixLengthEntryId(12345n, 7n)).toBe(
        '00000000000000000000000000012345-00000000000000000000000000000007',
      )
    })
  })

  describe('stringify', () => {
    it('serializes objects containing BigInt values without throwing', () => {
      const data = {
        amount: 1000000000000000000n,
        name: 'test',
      }
      expect(stringify(data)).toBe('{"amount":"1000000000000000000","name":"test"}')
    })
  })
})
