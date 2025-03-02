export type Extrinsic = {
  hash: string
  isSigned: boolean
  section: string
  method: string
  signer: string
  signature: any
  callIndex: number
  args: any
}
