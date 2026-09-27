import { address, decode } from '../src/address'
import { DEFAULT_SS58_FORMAT } from '../src/constants/wallet'

describe('Verify address utilities', () => {
  // Alice standard Substrate dev key
  const aliceAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
  const alicePublicKeyHex = '0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d'

  test('encodes public key bytes to SS58 address with default format', () => {
    const pubKey = decode(aliceAddress)
    const encoded = address(pubKey)
    expect(encoded).toBe(address(pubKey, DEFAULT_SS58_FORMAT))
    expect(encoded.length).toBeGreaterThan(0)
  })

  test('encodes public key with custom SS58 format', () => {
    const pubKey = decode(aliceAddress)
    const format42 = address(pubKey, 42) // Generic Substrate format
    expect(format42).toBe(aliceAddress)
  })

  test('decodes SS58 address to 32-byte public key', () => {
    const decoded = decode(aliceAddress)
    expect(decoded).toBeInstanceOf(Uint8Array)
    expect(decoded.length).toBe(32)

    // Convert to hex string and compare
    const hex = '0x' + Buffer.from(decoded).toString('hex')
    expect(hex).toBe(alicePublicKeyHex)
  })

  test('preserves address through decode and encode roundtrip', () => {
    const decoded = decode(aliceAddress)
    const reEncoded = address(decoded, 42)
    expect(reEncoded).toBe(aliceAddress)
  })

  test('throws descriptive error on malformed address', () => {
    expect(() => decode('invalid-address')).toThrow()
    expect(() => decode('')).toThrow()
  })
})
