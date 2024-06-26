import { AsnParser } from '@peculiar/asn1-schema'
import { Certificate } from '@peculiar/asn1-x509'
import { X509Certificate } from '@peculiar/x509'
import { ApiPromise, SubmittableResult, WsProvider } from '@polkadot/api'
import { KeyringPair } from '@polkadot/keyring/types'
import { derEncodeSignatureAlgorithmOID } from './utils'

interface RegistrationResult {
  receipt: SubmittableResult | null
  identifier: number | null
}

export class Registry {
  private api: ApiPromise
  private signer: KeyringPair | null

  constructor(rpcUrl: string = 'ws://127.0.0.1:9944', signer: KeyringPair | null = null) {
    this.api = new ApiPromise({ provider: new WsProvider(rpcUrl) })
    this.signer = signer
  }

  public async registerAutoId(
    certificate: X509Certificate,
    issuerId?: number,
  ): Promise<RegistrationResult> {
    await this.api.isReady

    if (!this.signer) {
      throw new Error('No signer provided')
    }

    const certificateBuffer = Buffer.from(certificate.rawData)
    // Load and parse the certificate
    const cert = AsnParser.parse(certificateBuffer, Certificate)
    const signatureAlgorithmOID = cert.signatureAlgorithm.algorithm

    const derEncodedOID = derEncodeSignatureAlgorithmOID(signatureAlgorithmOID)
    console.log(Buffer.from(derEncodedOID))
    console.log(`DER encoded OID: ${derEncodedOID}`)
    console.log(`Bytes length: ${derEncodedOID.length}`)

    const baseCertificate = {
      certificate: certificate.rawData,
      signature_algorithm: derEncodedOID,
      signature: certificate.signature,
    }

    const certificateParam = issuerId
      ? { Leaf: { issuer_id: issuerId, ...baseCertificate } }
      : { Root: baseCertificate }

    const req = { X509: certificateParam }

    let identifier: number | null = null

    const receipt: SubmittableResult = await new Promise((resolve, reject) => {
      this.api.tx.autoId.registerAutoId(req).signAndSend(this.signer!, (result) => {
        const { events = [], status } = result
        if (status.isInBlock || status.isFinalized) {
          events.forEach(({ event: { method, data } }) => {
            if (method === 'NewAutoIdRegistered') {
              const eventData = data[0].toHuman() as { attributes: number }
              identifier = eventData.attributes
            }
          })
          resolve(result)
        } else if (status.isDropped || status.isInvalid) {
          reject(new Error('Transaction dropped or invalid'))
        }
      })
    })

    return { receipt, identifier }
  }
}
