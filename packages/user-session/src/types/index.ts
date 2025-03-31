import type { AutoDriveApi, ConnectionOptions } from '@autonomys/auto-drive'
import { Contract } from 'ethers'

export type ContractOptions = {
  address: string
  privateKey: string
  rpcUrl: string
}

export type DataOptions = {
  fileName?: string
  password?: string
}

export type UsersSessionOptions = ConnectionOptions & ContractOptions & DataOptions

export type GetDataParams = {
  autoDriveApi: AutoDriveApi
  contract: Contract
  userId: string
  password?: string
}

export type GetDataResult<T> = {
  cid: string
  data: T
} | null

export type SaveDataParams<T> = {
  autoDriveApi: AutoDriveApi
  contract: Contract
  userId: string
  data: T
  fileName?: string
  password?: string
}

export type SaveDataResult = {
  cid: string
  txHash: string
}
