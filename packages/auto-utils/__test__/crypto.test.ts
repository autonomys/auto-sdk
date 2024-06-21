import { blake2b_256, concatenateUint8Arrays, stringToUint8Array } from '../src/crypto'

describe('Verify crypto functions', () => {
  test('Check blake2b_256 return the hash of the data', async () => {
    const message = 'Hello, world!'
    const message_bytes = stringToUint8Array(message)
    const hash = blake2b_256(message_bytes)
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
})
