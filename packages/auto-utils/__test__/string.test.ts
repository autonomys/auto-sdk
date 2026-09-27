import { capitalizeFirstLetter, fixLengthEntryId, shortString, stringify } from '../src/string'

describe('Verify string utilities', () => {
  describe('stringify', () => {
    test('serializes primitive values and objects', () => {
      expect(stringify({ name: 'alice', age: 30 })).toEqual('{"name":"alice","age":30}')
      expect(stringify([1, 2, 3])).toEqual('[1,2,3]')
    })

    test('serializes BigInt values as string representations', () => {
      const data = {
        balance: BigInt('1000000000000000000'),
        count: 5n,
      }
      expect(stringify(data)).toEqual('{"balance":"1000000000000000000","count":"5"}')
    })

    test('handles nested objects and arrays with BigInts', () => {
      const nested = {
        outer: {
          inner: 42n,
          list: [1n, 2n, 'text'],
        },
      }
      expect(stringify(nested)).toEqual('{"outer":{"inner":"42","list":["1","2","text"]}}')
    })

    test('supports optional indentation space argument', () => {
      const data = { value: 100n }
      const expected = JSON.stringify({ value: '100' }, null, 2)
      expect(stringify(data, 2)).toEqual(expected)
    })
  })

  describe('shortString', () => {
    const address = '5GmS1wtCfR4tK5SSgnZbVT4kYw5W8NmxmijcsxCQE6oLW6A8'

    test('truncates long strings using default parameters', () => {
      const result = shortString(address)
      expect(result).toBe('5GmS1w...W6A8')
    })

    test('supports custom initialLength and endLength', () => {
      expect(shortString(address, 8, -6)).toBe('5GmS1wtC...oLW6A8')
      // Positive endLength is converted to end offset
      expect(shortString(address, 8, 6)).toBe('5GmS1wtC...oLW6A8')
    })

    test('returns original string when shorter than or equal to truncation bounds', () => {
      expect(shortString('short')).toBe('short')
      expect(shortString('1234567890', 6, -4)).toBe('1234567890')
    })

    test('handles empty and nullish inputs safely', () => {
      expect(shortString('')).toBe('')
      expect(shortString(null)).toBe('')
      expect(shortString(undefined)).toBe('')
    })
  })

  describe('capitalizeFirstLetter', () => {
    test('capitalizes first letter of lowercase words', () => {
      expect(capitalizeFirstLetter('mainnet')).toBe('Mainnet')
      expect(capitalizeFirstLetter('taurus')).toBe('Taurus')
    })

    test('leaves uppercase and already capitalized words unchanged', () => {
      expect(capitalizeFirstLetter('UPPERCASE')).toBe('UPPERCASE')
      expect(capitalizeFirstLetter('Already')).toBe('Already')
    })

    test('handles single character and empty strings', () => {
      expect(capitalizeFirstLetter('a')).toBe('A')
      expect(capitalizeFirstLetter('')).toBe('')
      expect(capitalizeFirstLetter(null)).toBe('')
      expect(capitalizeFirstLetter(undefined)).toBe('')
    })
  })

  describe('fixLengthEntryId', () => {
    test('pads blockHeight to 32 characters with leading zeros', () => {
      const blockId = fixLengthEntryId(BigInt(12345))
      expect(blockId).toBe('00000000000000000000000000012345')
      expect(blockId.length).toBe(32)
    })

    test('formats entry ID with blockHeight and indexInBlock', () => {
      const txId = fixLengthEntryId(BigInt(12345), BigInt(7))
      expect(txId).toBe('00000000000000000000000000012345-00000000000000000000000000000007')
      expect(txId.length).toBe(65) // 32 + 1 + 32
    })

    test('preserves sorting order lexicographically', () => {
      const ids = [
        fixLengthEntryId(BigInt(100)),
        fixLengthEntryId(BigInt(50)),
        fixLengthEntryId(BigInt(200)),
      ]
      ids.sort()
      expect(ids[0]).toBe(fixLengthEntryId(BigInt(50)))
      expect(ids[1]).toBe(fixLengthEntryId(BigInt(100)))
      expect(ids[2]).toBe(fixLengthEntryId(BigInt(200)))
    })
  })
})
