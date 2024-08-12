import { AsnConvert } from '@peculiar/asn1-schema'
import { Certificate } from '@peculiar/asn1-x509'
import { Crypto } from '@peculiar/webcrypto'
import * as x509 from '@peculiar/x509'
import {
  OID_COMMON_NAME,
  certificateToPem,
  createAndSignCSR,
  getSubjectCommonName,
  issueCertificate,
  pemToCertificate,
  selfIssueCertificate,
} from '../src/certificateManager'
import { generateEd25519KeyPair, validateCertificatePublicKey } from '../src/keyManagement'

const crypto = new Crypto()

function getTbsCertificate(cert: x509.X509Certificate): ArrayBuffer {
  const asn1 = AsnConvert.parse(cert.rawData, Certificate)
  return AsnConvert.serialize(asn1.tbsCertificate)
}

describe('Certificate Management Functions', () => {
  it('create and sign CSR', async () => {
    const keyPair = await generateEd25519KeyPair()

    const subjectName = 'Test'
    const csr = await createAndSignCSR(subjectName, keyPair)
    expect(csr).not.toBeNull()

    const commonNameField = csr.subjectName.getField(OID_COMMON_NAME)[0]
    expect(commonNameField).toEqual(subjectName)

    await expect(validateCertificatePublicKey(csr.publicKey, keyPair.publicKey)).resolves.toEqual(
      true,
    )
  })

  it('issue certificate', async () => {
    const issuerKeyPair = await generateEd25519KeyPair()
    const subjectKeyPair = await generateEd25519KeyPair()

    const _issuerCertificate = await selfIssueCertificate('issuer', issuerKeyPair)

    const subjectName = 'Test'
    const csr = await createAndSignCSR(subjectName, subjectKeyPair)

    const certificate = await issueCertificate(csr, {
      certificate: _issuerCertificate,
      keyPair: issuerKeyPair,
    })

    expect(certificate).not.toBeNull()

    const commonNameField = csr.subjectName.getField(OID_COMMON_NAME)[0]
    expect(commonNameField).toEqual(subjectName)

    expect(
      await validateCertificatePublicKey(certificate.publicKey, subjectKeyPair.publicKey),
    ).toBe(true)

    const tbsCertificateBytes = getTbsCertificate(certificate)
    const signature = certificate.signature

    const isValidSignature = await crypto.subtle.verify(
      { name: 'Ed25519' },
      issuerKeyPair.publicKey,
      signature,
      tbsCertificateBytes,
    )
    expect(isValidSignature).toBe(true)
  })

  it('self issue certificate', async () => {
    const keyPair = await generateEd25519KeyPair()
    const subjectName = 'Test'
    const certificate = await selfIssueCertificate(subjectName, keyPair)

    expect(certificate).not.toBeNull()

    const commonNameField = certificate.subjectName.getField(OID_COMMON_NAME)[0]
    expect(commonNameField).toEqual(subjectName)

    expect(await validateCertificatePublicKey(certificate.publicKey, keyPair.publicKey)).toBe(true)

    const tbsCertificateBytes = getTbsCertificate(certificate)
    const signature = certificate.signature

    const isValidSignature = await crypto.subtle.verify(
      { name: 'Ed25519' },
      keyPair.publicKey,
      signature,
      tbsCertificateBytes,
    )
    expect(isValidSignature).toBe(true)
  })

  it('get subject common name', async () => {
    const keyPair = await generateEd25519KeyPair()
    const subjectName = 'Test'
    const certificate = await selfIssueCertificate(subjectName, keyPair)

    const commonName = getSubjectCommonName(certificate.subjectName)

    expect(commonName).toEqual(subjectName)
  })

  it('Certificate to Pem and back', async () => {
    const keyPair = await generateEd25519KeyPair()
    const subjectName = 'Test'
    const certificate = await selfIssueCertificate(subjectName, keyPair)
    const pemCertificate = certificateToPem(certificate)

    const certificateFromPem = pemToCertificate(pemCertificate)

    expect(certificate).toEqual(certificateFromPem)
  })
})
