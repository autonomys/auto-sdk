export type PasswordGenerationOptions = {
  password: string
  salt: string | Uint8Array
}

export enum EncryptorAlgorithm {
  AES_GCM = 'AES-GCM',
}

export interface EncryptorOptions {
  chunkSize?: number
  algorithm?: EncryptorAlgorithm
}
