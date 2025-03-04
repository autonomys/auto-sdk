export type Extrinsic = {
  hash: string
  isSigned: boolean
  section: string
  method: string
  signer: string
  signature: { [signatureType: string]: string }
  callIndex: number
  args: object
}
