import { address, decode } from '../src/address'
import { DEFAULT_SS58_FORMAT, MAINNET_SS58_FORMAT } from '../src/constants/wallet'

describe('Address utilities', () => {
  // Well-known Substrate test accounts
  const ALICE_SUBSTRATE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
  const ALICE_AUTONOMYS = 'sufsKsx4kZ26i7bJXc1TFguysVzjkzsDtE2VDiCEBY2WjyGAj'
  const ALICE_POLKADOT = '15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5'

  const BOB_SUBSTRATE = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty'
  const BOB_AUTONOMYS = 'sueJAbstcRJ6oxap2B5VJwa4uQ9isYKpYjCLteq6WU3bWCC6W'

  const CHARLIE_SUBSTRATE = '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y'

  describe('address', () => {
    test('encodes Substrate address to default Autonomys format (SS58 6094)', () => {
      const encoded = address(ALICE_SUBSTRATE)
      expect(encoded).toBe(ALICE_AUTONOMYS)
    })

    test('encodes raw 32-byte Uint8Array public key to default Autonomys format', () => {
      const pubKey = decode(ALICE_SUBSTRATE)
      expect(pubKey.length).toBe(32)
      const encoded = address(pubKey)
      expect(encoded).toBe(ALICE_AUTONOMYS)
    })

    test('supports custom SS58 format parameters', () => {
      // Format 42 (Generic Substrate)
      const substrateFormat = address(ALICE_AUTONOMYS, 42)
      expect(substrateFormat).toBe(ALICE_SUBSTRATE)

      // Format 0 (Polkadot)
      const polkadotFormat = address(ALICE_AUTONOMYS, 0)
      expect(polkadotFormat).toBe(ALICE_POLKADOT)

      // Explicit format 6094 (Autonomys)
      const autonomysFormat = address(ALICE_SUBSTRATE, MAINNET_SS58_FORMAT)
      expect(autonomysFormat).toBe(ALICE_AUTONOMYS)
    })

    test('is idempotent when encoding an already formatted address', () => {
      const firstPass = address(ALICE_SUBSTRATE)
      const secondPass = address(firstPass)
      expect(secondPass).toBe(ALICE_AUTONOMYS)
    })

    test('correctly encodes multiple distinct accounts', () => {
      expect(address(BOB_SUBSTRATE)).toBe(BOB_AUTONOMYS)

      const charlieEncoded = address(CHARLIE_SUBSTRATE)
      expect(typeof charlieEncoded).toBe('string')
      expect(charlieEncoded.startsWith('suf') || charlieEncoded.startsWith('sue')).toBe(true)
    })

    test('throws error for invalid address strings', () => {
      expect(() => address('invalid-address-string')).toThrow()
      expect(() => address('')).toThrow()
      expect(() => address('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQZ')).toThrow() // invalid checksum
    })

    test('throws error for Uint8Array with invalid length', () => {
      const invalidShortKey = new Uint8Array(16)
      expect(() => address(invalidShortKey)).toThrow()

      const invalidLengthKey = new Uint8Array(20)
      expect(() => address(invalidLengthKey)).toThrow()
    })
  })

  describe('decode', () => {
    test('decodes Autonomys address to 32-byte Uint8Array public key', () => {
      const decoded = decode(ALICE_AUTONOMYS)
      expect(decoded).toBeInstanceOf(Uint8Array)
      expect(decoded.length).toBe(32)
    })

    test('produces identical public key bytes regardless of SS58 prefix', () => {
      const fromSubstrate = decode(ALICE_SUBSTRATE)
      const fromAutonomys = decode(ALICE_AUTONOMYS)
      const fromPolkadot = decode(ALICE_POLKADOT)

      expect(Array.from(fromAutonomys)).toEqual(Array.from(fromSubstrate))
      expect(Array.from(fromPolkadot)).toEqual(Array.from(fromSubstrate))
    })

    test('maintains round-trip encoding and decoding fidelity', () => {
      const originalPubKey = decode(ALICE_SUBSTRATE)
      const reEncoded = address(originalPubKey)
      const reDecoded = decode(reEncoded)

      expect(Array.from(reDecoded)).toEqual(Array.from(originalPubKey))
    })

    test('decodes valid hex public key strings', () => {
      const hexPub = '0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d'
      const decodedHex = decode(hexPub)
      expect(decodedHex.length).toBe(32)
      expect(Array.from(decodedHex)).toEqual(Array.from(decode(ALICE_SUBSTRATE)))
    })

    test('throws error when decoding invalid or malformed address strings', () => {
      expect(() => decode('')).toThrow()
      expect(() => decode('not-an-address')).toThrow()
      // Substrate address with tampered checksum
      expect(() => decode('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQZ')).toThrow()
    })
  })

  describe('constants', () => {
    test('DEFAULT_SS58_FORMAT matches MAINNET_SS58_FORMAT', () => {
      expect(DEFAULT_SS58_FORMAT).toBe(6094)
      expect(MAINNET_SS58_FORMAT).toBe(6094)
      expect(DEFAULT_SS58_FORMAT).toBe(MAINNET_SS58_FORMAT)
    })
  })
})
