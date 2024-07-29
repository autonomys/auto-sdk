import { createAndSignCSR, issueCertificate, selfIssueCertificate } from '@autonomys/auto-id'
import {
  registerIssuerAutoId,
  registerLeafAutoId,
  renewRegisteredAutoId,
} from './auto-id-extrinsics'
import { setup } from './setup'
import { generateRandomString } from './utils'

const main = async () => {
  const { api, signer, issuerKeys, leafKeys } = await setup()

  const issuerSubjectCommonName = generateRandomString(10)
  const [issuerAutoIdIdentifier, issuerCert] = await registerIssuerAutoId(
    api,
    signer,
    issuerKeys,
    issuerSubjectCommonName,
  )
  const newSelfIssuedCert = await selfIssueCertificate(issuerSubjectCommonName, issuerKeys)
  const renewedSelf = await renewRegisteredAutoId(
    api,
    signer,
    issuerAutoIdIdentifier!,
    newSelfIssuedCert,
  )

  const leafSubjectCommonName = generateRandomString(10)
  const [leafAutoIdIdentifier, leafCert] = await registerLeafAutoId(
    api,
    signer,
    issuerCert,
    issuerKeys,
    issuerAutoIdIdentifier!,
    leafKeys,
    leafSubjectCommonName,
  )
  const newLeafCsr = await createAndSignCSR(leafSubjectCommonName, leafKeys)
  const newLeafIssuedCert = await issueCertificate(newLeafCsr, {
    certificate: issuerCert,
    keyPair: issuerKeys,
  })

  const renewedLeaf = await renewRegisteredAutoId(
    api,
    signer,
    leafAutoIdIdentifier!,
    newLeafIssuedCert,
  )
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)

    process.exit(1)
  })
