import { AsnParser } from '@peculiar/asn1-schema' // A library to parse ASN.1
import { Certificate } from '@peculiar/asn1-x509' // Assuming X.509 certificate handling
import fs from 'fs'
import { derEncodeSignatureAlgorithmOID } from '../src/utils'

describe('Verify crypto functions', () => {
  test('DER encode signature algorithm OID from a certificate', () => {
    // Load the certificate from a file
    const certPath = 'tests/issuer.cert.der'
    const certData = fs.readFileSync(certPath)

    // Load and parse the certificate
    const cert = AsnParser.parse(certData, Certificate)

    // Extract the OID of the signature algorithm
    const signatureAlgorithmOID = cert.signatureAlgorithm.algorithm

    // DER encode the OID
    const derEncodedOID = derEncodeSignatureAlgorithmOID(signatureAlgorithmOID.toString())

    // Expected DER encoded OID from a known good implementation (example hex string)
    const fromRustImplementation = new Uint8Array(
      Buffer.from('300d06092a864886f70d01010b0500', 'hex'),
    )

    // Compare the DER encoded OID with the expected result
    expect(new Uint8Array(derEncodedOID)).toEqual(fromRustImplementation)
  })
})
