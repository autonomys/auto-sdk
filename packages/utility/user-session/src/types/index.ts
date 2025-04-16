import type { AutoDriveApi, ConnectionOptions } from '@autonomys/auto-drive'
import { Contract } from 'ethers'

export type ContractOptions = {
  address: string
  privateKey: string
  rpcUrl: string
  waitReceipt?: boolean
}

export type DataOptions = {
  fileName?: string
  password?: string
  showLogs?: boolean
}

export type UsersSessionOptions = ConnectionOptions & ContractOptions & DataOptions

export type GetDataParams = {
  autoDriveApi: AutoDriveApi
  contract: Contract
  userId: string
  password?: string
  showLogs?: boolean
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
  showLogs?: boolean
  waitReceipt?: boolean
}

export type SaveDataResult = {
  cid: string
  txHash: string
}
