import { capitalizeFirstLetter, fixLengthEntryId, shortString, stringify } from '../src/string'

describe('String utilities', () => {
  describe('stringify', () => {
    test('serializes primitive values and standard objects like JSON.stringify', () => {
      const data = {
        name: 'Autonomys',
        active: true,
        count: 42,
        tags: ['subspace', 'ai'],
      }
      expect(stringify(data)).toBe(JSON.stringify(data))
    })

    test('serializes objects containing BigInt values without throwing', () => {
      const data = {
        balance: 1000000000000000000n,
        network: 'taurus',
      }
      expect(() => JSON.stringify(data)).toThrow(TypeError)
      expect(() => stringify(data)).not.toThrow()
      expect(stringify(data)).toBe('{"balance":"1000000000000000000","network":"taurus"}')
    })

    test('serializes arrays containing BigInt values', () => {
      const list = [1n, 2n, 100n]
      expect(stringify(list)).toBe('["1","2","100"]')
    })

    test('serializes deeply nested structures with mixed BigInt and primitive fields', () => {
      const nested = {
        level1: {
          level2: {
            fee: 5000000000n,
            recipients: [{ amount: 2500000000n, id: 'user1' }],
          },
        },
      }
      const serialized = stringify(nested)
      const parsed = JSON.parse(serialized)
      expect(parsed.level1.level2.fee).toBe('5000000000')
      expect(parsed.level1.level2.recipients[0].amount).toBe('2500000000')
    })

    test('handles null and undefined values properly', () => {
      expect(stringify(null)).toBe('null')
      expect(stringify({ value: null })).toBe('{"value":null}')
      expect(stringify({ value: undefined })).toBe('{}')
    })
  })

  describe('shortString', () => {
    const address = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
    const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'

    test('truncates strings using default initialLength (6) and endLength (-4)', () => {
      const truncated = shortString(address)
      expect(truncated).toBe('5Grwva...utQY')
      expect(truncated.startsWith('5Grwva')).toBe(true)
      expect(truncated.endsWith('utQY')).toBe(true)
    })

    test('truncates hashes with custom initialLength and endLength', () => {
      const customShort = shortString(txHash, 10, -8)
      expect(customShort).toBe('0x12345678...90abcdef')
    })

    test('handles short custom slice bounds', () => {
      const result = shortString(address, 2, -2)
      expect(result).toBe('5G...QY')
    })
  })

  describe('capitalizeFirstLetter', () => {
    test('capitalizes the first letter of lowercase strings', () => {
      expect(capitalizeFirstLetter('mainnet')).toBe('Mainnet')
      expect(capitalizeFirstLetter('taurus')).toBe('Taurus')
      expect(capitalizeFirstLetter('subspace')).toBe('Subspace')
    })

    test('handles single character strings', () => {
      expect(capitalizeFirstLetter('a')).toBe('A')
      expect(capitalizeFirstLetter('Z')).toBe('Z')
    })

    test('preserves already capitalized and uppercase strings', () => {
      expect(capitalizeFirstLetter('Autonomys')).toBe('Autonomys')
      expect(capitalizeFirstLetter('UPPERCASE')).toBe('UPPERCASE')
    })

    test('returns empty string when input is empty string', () => {
      expect(capitalizeFirstLetter('')).toBe('')
    })

    test('handles strings beginning with digits or symbols without alteration', () => {
      expect(capitalizeFirstLetter('123hello')).toBe('123hello')
      expect(capitalizeFirstLetter('!important')).toBe('!important')
      expect(capitalizeFirstLetter('_internal')).toBe('_internal')
    })
  })

  describe('fixLengthEntryId', () => {
    test('pads blockHeight to 32 characters when indexInBlock is omitted', () => {
      const id = fixLengthEntryId(12345n)
      expect(id).toBe('00000000000000000000000000012345')
      expect(id.length).toBe(32)
    })

    test('pads both blockHeight and indexInBlock separated by a hyphen', () => {
      const id = fixLengthEntryId(12345n, 7n)
      expect(id).toBe('00000000000000000000000000012345-00000000000000000000000000000007')
      expect(id.length).toBe(65)
    })

    test('handles zero block height and zero index', () => {
      const zeroBlock = fixLengthEntryId(0n)
      expect(zeroBlock).toBe('0'.repeat(32))

      const zeroBoth = fixLengthEntryId(0n, 0n)
      expect(zeroBoth).toBe(`${'0'.repeat(32)}-${'0'.repeat(32)}`)
    })

    test('handles large 64-bit BigInt values', () => {
      const largeHeight = 1000000000000000000n
      const id = fixLengthEntryId(largeHeight)
      expect(id).toBe('00000000000001000000000000000000')
      expect(id.length).toBe(32)
    })

    test('enables proper lexicographical sorting of block identifiers', () => {
      const heights = [1000n, 20n, 500n, 3n, 10000n]
      const ids = heights.map((h) => fixLengthEntryId(h))
      const sortedIds = [...ids].sort()

      const expectedOrder = [3n, 20n, 500n, 1000n, 10000n].map((h) => fixLengthEntryId(h))
      expect(sortedIds).toEqual(expectedOrder)
    })
  })
})
