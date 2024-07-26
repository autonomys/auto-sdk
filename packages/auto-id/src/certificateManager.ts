import {
  blake2b_256,
  concatenateUint8Arrays,
  save,
  stringToUint8Array,
} from '@autonomys/auto-utils'
import { AsnConvert } from '@peculiar/asn1-schema'
import { AttributeTypeAndValue, GeneralNames } from '@peculiar/asn1-x509'
import { Crypto } from '@peculiar/webcrypto'
import * as x509 from '@peculiar/x509'
import { validateCertificatePublicKey } from './keyManagement'

const crypto = new Crypto()
x509.cryptoProvider.set(crypto)

export const OID_COMMON_NAME = '2.5.4.3'
const OID_SUBJECT_ALT_NAME = '2.5.29.17'

type SigningParams = {
  privateKey: CryptoKey
  algorithm: 'SHA-256' | null
}

type CertificateData = {
  certificate?: x509.X509Certificate
  keyPair: CryptoKeyPair
}

const prepareSigningParams = (keyPair: CryptoKeyPair): SigningParams => {
  if (keyPair.privateKey.algorithm.name === 'Ed25519') {
    return { privateKey: keyPair.privateKey, algorithm: null }
  }
  if (keyPair.privateKey.algorithm.name === 'RSASSA-PKCS1-v1_5') {
    return { privateKey: keyPair.privateKey, algorithm: 'SHA-256' }
  }
  throw new Error('Unsupported key type for signing.')
}

const toCommonName = (subjectName: string): x509.Name => {
  const commonNameAttr = new AttributeTypeAndValue({
    type: OID_COMMON_NAME,
    value: subjectName,
  })
  return new x509.Name([[commonNameAttr]])
}

export const prettyPrintCertificate = (cert: x509.X509Certificate): void => {
  console.log('Certificate:')
  console.log('============')
  console.log(`Subject: ${cert.subject}`)
  console.log(`Issuer: ${cert.issuer}`)
  console.log(`Serial Number: ${cert.serialNumber}`)
  console.log(`Not Valid Before: ${cert.notBefore}`)
  console.log(`Not Valid After: ${cert.notAfter}`)

  console.log('\nExtensions:')
  cert.extensions.forEach((ext) => {
    console.log(` - ${ext.type}: ${JSON.stringify(ext.value)}`)
  })
  console.log('\nPublic Key:')
  console.log(cert.publicKey)
}

export const certificateToPem = (cert: x509.X509Certificate): string => cert.toString('pem')

export const pemToCertificate = (pem: string): x509.X509Certificate => new x509.X509Certificate(pem)

export const getSubjectCommonName = (subject: x509.Name): string | undefined => {
  const commonNames = subject.getField(OID_COMMON_NAME)
  return commonNames.length > 0 ? commonNames[0] : undefined
}

export const getCertificateAutoId = (certificate: x509.X509Certificate): string | undefined => {
  const sanExtension = certificate.extensions.find((ext) => ext.type === OID_SUBJECT_ALT_NAME)

  if (sanExtension && sanExtension.value) {
    const san = AsnConvert.parse(sanExtension.value, GeneralNames)

    for (const name of san) {
      if (
        name.uniformResourceIdentifier &&
        name.uniformResourceIdentifier.startsWith('autoid:auto:')
      ) {
        return name.uniformResourceIdentifier.split(':').pop()
      }
    }
  }
  return undefined
}

export const createCSR = async (
  subjectName: string,
  keyPair: CryptoKeyPair,
): Promise<x509.Pkcs10CertificateRequest> => {
  let signingAlgorithm: Algorithm | EcdsaParams
  if (keyPair.privateKey.algorithm.name === 'Ed25519') {
    signingAlgorithm = { name: 'Ed25519' }
  } else if (keyPair.privateKey.algorithm.name === 'RSASSA-PKCS1-v1_5') {
    signingAlgorithm = { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } }
  } else {
    throw new Error('Unsupported key type for signing')
  }

  return await x509.Pkcs10CertificateRequestGenerator.create({
    name: `CN=${subjectName}`,
    keys: keyPair,
    signingAlgorithm,
  })
}

export const signCSR = async (
  csr: x509.Pkcs10CertificateRequest,
  keyPair: CryptoKeyPair,
): Promise<x509.Pkcs10CertificateRequest> => {
  const { algorithm } = prepareSigningParams(keyPair)
  const derBuffer = csr.rawData
  const signature = await crypto.subtle.sign(
    keyPair.privateKey.algorithm.name,
    keyPair.privateKey,
    derBuffer,
  )
  csr.signature = new Uint8Array(signature)
  return csr
}

export const createAndSignCSR = async (
  subjectName: string,
  keyPair: CryptoKeyPair,
): Promise<x509.Pkcs10CertificateRequest> => {
  const csr = await createCSR(subjectName, keyPair)
  return signCSR(csr, keyPair)
}

export const issueCertificate = async (
  csr: x509.Pkcs10CertificateRequest,
  issuerCertificateData: CertificateData,
  validityPeriodDays: number = 365,
): Promise<x509.X509Certificate> => {
  const { keyPair, certificate: issuerCertificate } = issuerCertificateData

  let issuerName: x509.Name
  let autoId: string

  if (!issuerCertificate) {
    issuerName = csr.subjectName
    const subjectCommonName = getSubjectCommonName(issuerName)
    if (!subjectCommonName) {
      throw new Error('Subject common name not found in CSR.')
    }
    autoId = blake2b_256(stringToUint8Array(subjectCommonName))
  } else {
    if (!validateCertificatePublicKey(issuerCertificate.publicKey, keyPair.publicKey)) {
      throw new Error(
        'Issuer certificate public key does not match the private key used for signing.',
      )
    }

    issuerName = issuerCertificate.subjectName
    const certificateAutoId = getCertificateAutoId(issuerCertificate) || ''
    const certificateSubjectCommonName = getSubjectCommonName(issuerCertificate.subjectName) || ''
    if (certificateAutoId === '' || certificateSubjectCommonName === '') {
      throw new Error(
        'Issuer certificate does not have either an auto ID or a subject common name or both.',
      )
    }
    autoId = blake2b_256(
      concatenateUint8Arrays(
        stringToUint8Array(certificateAutoId),
        stringToUint8Array(certificateSubjectCommonName),
      ),
    )
  }

  const notBefore = new Date()
  const notAfter = new Date(notBefore.getTime() + validityPeriodDays * 24 * 60 * 60 * 1000)

  const certificateBuilder = await x509.X509CertificateGenerator.create({
    issuer: issuerCertificate ? issuerCertificate.subject : csr.subject,
    subject: csr.subject,
    notBefore,
    notAfter,
    signingAlgorithm: keyPair.privateKey.algorithm,
    publicKey: csr.publicKey,
    signingKey: keyPair.privateKey,
  })

  const autoIdSan = `autoid:auto:${Buffer.from(autoId).toString('hex')}`

  const sanExtensions = csr.extensions.filter((ext) => ext.type === OID_SUBJECT_ALT_NAME)
  if (sanExtensions.length) {
    const existingSan = sanExtensions[0] as x509.SubjectAlternativeNameExtension
    const generalNames = existingSan.names.toJSON()
    generalNames.push({
      type: 'url' as x509.GeneralNameType,
      value: autoIdSan,
    })
    const newSanExtension = new x509.SubjectAlternativeNameExtension(
      generalNames,
      existingSan.critical,
    )
    certificateBuilder.extensions.push(newSanExtension)
  } else {
    certificateBuilder.extensions.push(
      new x509.SubjectAlternativeNameExtension([
        { type: 'url' as x509.GeneralNameType, value: autoIdSan },
      ]),
    )
  }

  certificateBuilder.extensions.push(...csr.extensions)

  return await x509.X509CertificateGenerator.create({
    serialNumber: certificateBuilder.serialNumber,
    issuer: certificateBuilder.issuer,
    subject: certificateBuilder.subject,
    notBefore: certificateBuilder.notBefore,
    notAfter: certificateBuilder.notAfter,
    extensions: certificateBuilder.extensions,
    publicKey: certificateBuilder.publicKey,
    signingAlgorithm: certificateBuilder.signatureAlgorithm,
    signingKey: keyPair.privateKey,
  })
}

export const selfIssueCertificate = async (
  subjectName: string,
  keyPair: CryptoKeyPair,
  validityPeriodDays: number = 365,
): Promise<x509.X509Certificate> => {
  const csr = await createAndSignCSR(subjectName, keyPair)
  return issueCertificate(csr, { certificate: undefined, keyPair }, validityPeriodDays)
}

export const saveCertificate = async (
  certificate: x509.X509Certificate,
  filePath: string,
): Promise<void> => {
  const certificatePem = certificateToPem(certificate)
  await save(filePath, certificatePem)
}
