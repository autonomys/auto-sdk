import { ApiPromise } from '@autonomys/auto-utils'
import { getCertificateSubjectPublicKey } from './registry'
import { Crypto } from '@peculiar/webcrypto'

const crypto = typeof window === 'undefined' ? new Crypto() : window.crypto

export const authenticateAutoIdUser = async (
  api: ApiPromise,
  autoId: string,
  challenge: BufferSource,
  signature: BufferSource,
): Promise<boolean> => {
  const publicKey = await getCertificateSubjectPublicKey(api, autoId)

  return crypto.subtle.verify(
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    publicKey,
    signature,
    challenge,
  )
}
