import { ApiPromise } from '@autonomys/auto-utils'
import { getCertificate } from '../registry'
import { CertificateActionType, Signature } from '../types'

import { AsnConvert } from '@peculiar/asn1-schema'
import { AlgorithmIdentifier } from '@peculiar/asn1-x509'
import { Crypto } from '@peculiar/webcrypto'
import { bnToU8a, compactAddLength, u8aConcat } from '@polkadot/util'
import { hexStringToU8a } from '../misc-utils'

const crypto = new Crypto()

const getAutoIdNonce = async (api: ApiPromise, autoIdentifier: string): Promise<number> => {
  const autoIdCertificate = await getCertificate(api, autoIdentifier)
  if (!autoIdCertificate) {
    throw new Error('AutoId certificate not found')
  }

  return autoIdCertificate.nonce
}

export const createCertificateAction = async (
  api: ApiPromise,
  autoIdentifier: string,
  actionType: CertificateActionType,
): Promise<Uint8Array | undefined> => {
  const autoIdCertificate = await getCertificate(api, autoIdentifier)
  if (!autoIdCertificate) {
    return undefined
  }
  const nonce =
    autoIdCertificate.issuerId && actionType === CertificateActionType.RevokeCertificate
      ? await getAutoIdNonce(api, autoIdCertificate.issuerId)
      : autoIdCertificate.nonce

  const autoIdU8a = hexStringToU8a(autoIdentifier)
  const nonceU8a = bnToU8a(BigInt(nonce), { bitLength: 256, isLe: false })
  const actionTypeU8a = new Uint8Array([actionType])
  const encodedAction = u8aConcat(autoIdU8a, nonceU8a, actionTypeU8a)

  return encodedAction
}

const getAlgorithmIdentifier = (algorithm: KeyAlgorithm): AlgorithmIdentifier => {
  switch (algorithm.name) {
    case 'RSASSA-PKCS1-v1_5':
      return new AlgorithmIdentifier({
        algorithm: '1.2.840.113549.1.1.11', // SHA256 with RSA
        parameters: null,
      })
    case 'Ed25519':
      return new AlgorithmIdentifier({
        algorithm: '1.3.101.112', // Ed25519
        parameters: null,
      })
    default:
      throw new Error('Unsupported algorithm')
  }
}

export const signCertificateAction = async (
  data: Uint8Array,
  signingKey: CryptoKey,
): Promise<Signature> => {
  const signature = await crypto.subtle.sign(signingKey.algorithm, signingKey, data)
  const signatureU8a = new Uint8Array(signature)
  const algorithmOID = getAlgorithmIdentifier(signingKey.algorithm)
  const derEncodedOID = new Uint8Array(AsnConvert.serialize(algorithmOID))

  return {
    signature_algorithm: compactAddLength(derEncodedOID),
    value: compactAddLength(signatureU8a),
  }
}
