// eslint-disable-next-line camelcase -- published API name
import { blake2b_256, concatenateUint8Arrays, stringToUint8Array } from '@autonomys/auto-utils'

describe('Verify crypto functions', () => {
  test('Check blake2b_256 return the hash of the data', async () => {
    const message = 'Hello, world!'
    const messageBytes = stringToUint8Array(message)
    const hash = blake2b_256(messageBytes)
    expect(hash).toEqual('0xb5da441cfe72ae042ef4d2b17742907f675de4da57462d4c3609c2e2ed755970')
  })

  test('should encode strings to Uint8Arrays and concatenate them correctly', () => {
    // Define test strings
    const string1 = 'Hello'
    const string2 = 'World'

    // Encode strings to Uint8Arrays
    const encodedString1 = stringToUint8Array(string1)
    const encodedString2 = stringToUint8Array(string2)

    // Manually create expected encoded arrays if known (for illustration)
    const expectedEncoded1 = new Uint8Array([72, 101, 108, 108, 111]) // ASCII values for "Hello"
    const expectedEncoded2 = new Uint8Array([87, 111, 114, 108, 100]) // ASCII values for "World"

    // Test individual encoding
    expect(encodedString1).toEqual(expectedEncoded1)
    expect(encodedString2).toEqual(expectedEncoded2)

    // Concatenate encoded arrays
    const concatenatedArrays = concatenateUint8Arrays(encodedString1, encodedString2)

    // Manually create the expected concatenated result
    const expectedConcatenation = new Uint8Array([72, 101, 108, 108, 111, 87, 111, 114, 108, 100]) // Combined ASCII

    // Test concatenation result
    expect(concatenatedArrays).toEqual(expectedConcatenation)
    expect(concatenatedArrays.length).toBe(encodedString1.length + encodedString2.length)
  })

  test('should concatenate three or more Uint8Arrays correctly', () => {
    const part1 = stringToUint8Array('Alpha')
    const part2 = stringToUint8Array('Beta')
    const part3 = stringToUint8Array('Gamma')
    const part4 = stringToUint8Array('Delta')

    const combined = concatenateUint8Arrays(part1, part2, part3, part4)
    const expected = stringToUint8Array('AlphaBetaGammaDelta')

    expect(combined).toEqual(expected)
    expect(combined.length).toBe(part1.length + part2.length + part3.length + part4.length)
  })

  test('should return a copy of a single Uint8Array', () => {
    const original = stringToUint8Array('Single')
    const result = concatenateUint8Arrays(original)

    expect(result).toEqual(original)
    expect(result).not.toBe(original) // should be a new Uint8Array copy
  })

  test('should handle empty arrays and empty arguments gracefully', () => {
    const empty1 = new Uint8Array(0)
    const empty2 = new Uint8Array(0)
    const nonEmpty = stringToUint8Array('NonEmpty')

    expect(concatenateUint8Arrays()).toEqual(new Uint8Array(0))
    expect(concatenateUint8Arrays(empty1, empty2)).toEqual(new Uint8Array(0))
    expect(concatenateUint8Arrays(empty1, nonEmpty, empty2)).toEqual(nonEmpty)
  })
})
