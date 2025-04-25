import { ethers } from 'ethers'

export type ExperienceHeader = {
  agentVersion: string
  //TODO: when we have an identity scheme update to use an identifier for the agent
  agentName: string
  timestamp: string
  previousCid?: string
}

export type AgentExperience = {
  header: ExperienceHeader
  data: unknown
  signature: string
}

export type AgentExperienceV0 = {
  timestamp: string
  previousCid: string
  agentVersion: string
  signature: string
  [key: string]: unknown
}

export type StoredHash = {
  hash: string
  timestamp: string
}

export type AutoDriveApiOptions = {
  apiKey: string
  network: 'taurus' | 'mainnet'
}

export type ExperienceUploadOptions = {
  compression: boolean
  password?: string
}

export type EvmOptions = {
  privateKey: string
  rpcUrl: string
  contractAddress: string
}

export type AgentOptions = {
  agentName: string
  agentPath: string
  agentVersion?: string
}

export type ExperienceManagerOptions = {
  autoDriveApiOptions: AutoDriveApiOptions
  uploadOptions: ExperienceUploadOptions
  walletOptions: EvmOptions
  agentOptions: AgentOptions
}

export type CidManager = {
  getLastMemoryCid: () => Promise<string | undefined>
  saveLastMemoryCid: (cid: string) => Promise<ethers.TransactionReceipt | undefined>
  localHashStatus: { message: string }
}

export type ExperienceManager = {
  saveExperience: (data: unknown) => Promise<ExperienceSaveResult>
  retrieveExperience: (cid: string) => Promise<AgentExperience | AgentExperienceV0>
  cidManager: CidManager
}

/**
 * Defines the structure of the object returned when an experience is successfully saved.
 */
export type ExperienceSaveResult = {
  /** The CID of the newly saved experience object in AutoDrive. */
  cid: string
  /** The CID of the experience that was previously considered the latest (if any). */
  previousCid: string | undefined
  /** The transaction hash from the EVM receipt when saving the CID on-chain (if successful). */
  evmHash: string | undefined
}
