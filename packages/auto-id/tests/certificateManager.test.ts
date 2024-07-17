import { AsnConvert } from '@peculiar/asn1-schema'
import { Certificate } from '@peculiar/asn1-x509'
import { Crypto } from '@peculiar/webcrypto'
import * as x509 from '@peculiar/x509'
import { CertificateManager, OID_COMMON_NAME } from '../src/certificateManager'
import { generateEd25519KeyPair, validateCertificatePublicKey } from '../src/keyManagement'

const crypto = new Crypto()

function getTbsCertificate(cert: x509.X509Certificate): ArrayBuffer {
  const asn1 = AsnConvert.parse(cert.rawData, Certificate)
  return AsnConvert.serialize(asn1.tbsCertificate)
}

describe('CertificateManager', () => {
  it('create and sign CSR', async () => {
    // Generate an Ed25519 key pair
    const [privateKey, publicKey] = await generateEd25519KeyPair()

    // Instantiate CertificateManager with the generated private key
    const certificateManager = new CertificateManager(null, privateKey, publicKey)

    // Create and sign a CSR
    const subjectName = 'Test'
    const csr = await certificateManager.createAndSignCSR(subjectName)
    expect(csr).not.toBeNull()

    // Assert that the CSR subject name matches the provided subject name
    const commonNameField = csr.subjectName.getField(OID_COMMON_NAME)[0]
    expect(commonNameField).toEqual(subjectName)

    expect(await validateCertificatePublicKey(csr.publicKey, publicKey)).toBe(true)
  })

  it('issue certificate', async () => {
    // Generate an Ed25519 key pair
    const [issuerPrivateKey, issuerPublicKey] = await generateEd25519KeyPair()
    const [subjectPrivateKey, subjectPublicKey] = await generateEd25519KeyPair()

    const issuer = new CertificateManager(null, issuerPrivateKey, issuerPublicKey)
    const _issuerCertificate = await issuer.selfIssueCertificate('issuer')

    // Define the subject name for the certificate
    const subjectName = 'Test'
    const csrCreator = new CertificateManager(null, subjectPrivateKey, subjectPublicKey)

    // Call the createCSR function to generate a CSR
    const csr = await csrCreator.createAndSignCSR(subjectName)

    // Issue a certificate using the CSR
    const certificate = await issuer.issueCertificate(csr)

    // Assert that the certificate is not null
    expect(certificate).not.toBeNull()

    // Assert that the certificate subject name matches the provided subject name
    const commonNameField = csr.subjectName.getField(OID_COMMON_NAME)[0]
    expect(commonNameField).toEqual(subjectName)

    // Assert that the certificate public key matches the private key's public key
    expect(await validateCertificatePublicKey(csr.publicKey, subjectPublicKey)).toBe(true)

    const tbsCertificateBytes = getTbsCertificate(certificate)
    const signature = certificate.signature

    const isValidSignature = await crypto.subtle.verify(
      {
        name: 'Ed25519',
      },
      issuerPublicKey,
      signature,
      tbsCertificateBytes,
    )
    expect(isValidSignature).toBe(true)
  })

  it('self issue certificate', async () => {
    // Create a private key for testing
    const [privateKey, publicKey] = await generateEd25519KeyPair()
    const selfIssuer = new CertificateManager(null, privateKey, publicKey)
    const certificate = await selfIssuer.selfIssueCertificate('Test')

    // Define the subject name for the certificate
    const subjectName = 'Test'

    // Assert that the certificate is not null
    expect(certificate).not.toBeNull()

    // Assert that the certificate subject name matches the provided subject name
    const commonNameField = certificate.subjectName.getField(OID_COMMON_NAME)[0]
    expect(commonNameField).toEqual(subjectName)

    // Assert that the certificate public key matches the private key's public key
    expect(await validateCertificatePublicKey(certificate.publicKey, publicKey)).toBe(true)

    const tbsCertificateBytes = getTbsCertificate(certificate)
    const signature = certificate.signature

    const isValidSignature = await crypto.subtle.verify(
      {
        name: 'Ed25519',
      },
      publicKey,
      signature,
      tbsCertificateBytes,
    )
    expect(isValidSignature).toBe(true)
  })

  it('get subject common name', async () => {
    // Create a private key for testing
    const [privateKey, publicKey] = await generateEd25519KeyPair()
    const selfIssuer = new CertificateManager(null, privateKey, publicKey)
    const certificate = await selfIssuer.selfIssueCertificate('Test')

    // Define the subject name for the certificate
    const subjectName = 'Test'

    // Retrieve the common name from the certificate
    const commonName = CertificateManager.getSubjectCommonName(certificate.subjectName)

    // Assert that the common name matches the provided subject name
    expect(commonName).toEqual(subjectName)
  })

  it('Certificate to Pem and back', async () => {
    // Create a private key for testing
    const [privateKey, publicKey] = await generateEd25519KeyPair()
    const selfIssuer = new CertificateManager(null, privateKey, publicKey)
    // Define the subject name for the certificate
    const subjectName = 'Test'
    const certificate = await selfIssuer.selfIssueCertificate(subjectName)
    const pemCertificate = CertificateManager.certificateToPem(certificate)

    // Convert the PEM back to a certificate
    const certificateFromPem = CertificateManager.pemToCertificate(pemCertificate)

    expect(certificate).toEqual(certificateFromPem)
  })
})
