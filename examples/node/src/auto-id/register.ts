import { registerIssuerAutoId } from './auto-id-extrinsics'
import { setup } from './setup'
import { generateRandomString } from './utils'

const main = async () => {
  const { api, signer, issuerKeys } = await setup()

  const issuerSubjectCommonName = generateRandomString(10)
  const [issuerAutoIdIdentifier, issuerCert] = await registerIssuerAutoId(
    api,
    signer,
    issuerKeys,
    issuerSubjectCommonName,
  )
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
