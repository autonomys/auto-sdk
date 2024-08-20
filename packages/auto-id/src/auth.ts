import { ApiPromise } from '@autonomys/auto-utils'
import { getCertificateSubjectPublicKey } from './registry'
import { crypto } from './utils/crypto'

//// This function is used to authenticate an Auto-ID user.
/// It verifies the signature of the challenge using the public key of the Auto-ID user.
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
