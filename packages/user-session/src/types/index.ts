import type { ConnectionOptions } from '@autonomys/auto-drive'

export type ContractOptions = {
  address: string
  privateKey: string
  rpcUrl: string
}

export type UsersSessionOptions = ConnectionOptions & ContractOptions
