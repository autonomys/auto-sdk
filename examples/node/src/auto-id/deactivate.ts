import {
  CertificateActionType,
  createCertificateAction,
  signCertificateAction,
} from '@autonomys/auto-id'
import { deactivateRegisteredAutoId, registerIssuerAutoId } from './auto-id-extrinsics'
import { setup } from './setup'
import { generateRandomString } from './utils'

async function main() {
  const { api, signer, issuerKeys } = await setup()

  const issuerSubjectCommonName = generateRandomString(10)
  const [issuerAutoIdIdentifier, issuerCert] = await registerIssuerAutoId(
    api,
    signer,
    issuerKeys,
    issuerSubjectCommonName,
  )

  if (!issuerAutoIdIdentifier) {
    throw new Error('Issuer auto id failed')
  }

  const deactivateAction = await createCertificateAction(
    api,
    issuerAutoIdIdentifier,
    CertificateActionType.DeactivateAutoId,
  )
  if (!deactivateAction) {
    throw new Error('Revocation action failed')
  }

  const signature = await signCertificateAction(deactivateAction, issuerKeys.privateKey)
  const deactivated = await deactivateRegisteredAutoId(
    api,
    signer,
    issuerAutoIdIdentifier,
    signature,
  )
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
