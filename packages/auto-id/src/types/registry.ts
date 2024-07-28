export interface AutoIdX509Certificate {
  issuerId?: string
  serial: string
  subjectCommonName: string
  subjectPublicKeyInfo: string
  validity: {
    notBefore: number
    notAfter: number
  }
  raw: string
  issuedSerials: string[]
  nonce: number
}

export enum CertificateActionType {
  RevokeCertificate,
  DeactivateAutoId,
}
