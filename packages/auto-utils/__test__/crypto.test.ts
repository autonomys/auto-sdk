import { blake2b_256, stringToUint8Array } from '../src/crypto'

describe('Verify crypto functions', () => {
  test('Check blake2b_256 return the hash of the data', async () => {
    const message = 'Hello, world!'
    const message_bytes = stringToUint8Array(message)
    const hash = blake2b_256(message_bytes)
    expect(hash).toEqual('0xb5da441cfe72ae042ef4d2b17742907f675de4da57462d4c3609c2e2ed755970')
  })

  test('Check stringToUint8Array return the byte array of the string', async () => {
    const message = 'Hello, world!'
    const byteArray = stringToUint8Array(message)
    expect(byteArray).toBeInstanceOf(Uint8Array)
  })
})
