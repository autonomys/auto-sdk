import { ethers } from 'ethers'

/**
 * Represents the metadata header included in a saved agent experience.
 */
export type ExperienceHeader = {
  /** The version identifier of the agent that generated the experience. */
  agentVersion: string
  /** The name identifier of the agent. TODO: Update to use a more robust identity scheme. */
  agentName: string
  /** ISO 8601 timestamp indicating when the experience was generated or saved. */
  timestamp: string
  /** The Content Identifier (CID) of the previous experience in the sequence, if any. */
  previousCid?: string
}

/**
 * Represents a complete agent experience package, including header, data, and signature.
 */
export type AgentExperience = {
  /** Metadata associated with the experience. */
  header: ExperienceHeader
  /** The actual data payload of the experience (e.g., agent state, memory). */
  data: unknown
  /** A cryptographic signature verifying the integrity and origin of the experience. */
  signature: string
}

/**
 * Represents the structure of an older version (V0) of the agent experience.
 */
export type AgentExperienceV0 = {
  /** Timestamp of the experience generation. */
  timestamp: string
  /** CID of the previous experience. */
  previousCid: string
  /** Version of the agent. */
  agentVersion: string
  /** Cryptographic signature. */
  signature: string
  /** Allows for additional arbitrary data properties present in the V0 format. */
  [key: string]: unknown
}

/**
 * Represents a stored hash record, typically mapping a key (like an agent identifier)
 * to a content hash (CID) and a timestamp.
 */
export type StoredHash = {
  /** The stored hash value (e.g., a CID). */
  hash: string
  /** ISO 8601 timestamp associated with the hash storage. */
  timestamp: string
}

/**
 * Configuration options for the AutoDrive API client.
 */
export type AutoDriveApiOptions = {
  /** Your API key for authenticating with the AutoDrive service. */
  apiKey: string
  /** The target AutoDrive network ('taurus' for testnet, 'mainnet' for mainnet). */
  network: 'taurus' | 'mainnet'
}

/**
 * Options for configuring how agent experiences are uploaded.
 */
export type ExperienceUploadOptions = {
  /** Whether to compress the experience data before uploading. */
  compression: boolean
  /** Optional password for encrypting the experience data during upload. */
  password?: string
}

/**
 * Configuration options related to EVM (Ethereum Virtual Machine) interactions,
 * typically for signing messages or interacting with smart contracts.
 */
export type EvmOptions = {
  /** The private key of the wallet used for signing or transactions. */
  privateKey: string
  /** Information about the smart contract to interact with (e.g., for storing CIDs). */
  contractInfo?: {
    /** The URL of the EVM-compatible JSON-RPC endpoint. */
    rpcUrl: string
    /** The address of the smart contract to interact with (e.g., for storing CIDs). */
    contractAddress: string
  }
}

/**
 * Configuration options specific to the agent itself.
 */
export type AgentOptions = {
  /** The name identifier for the agent. */
  agentName: string
  /** The file system path where the agent's data (like the last CID file) is stored. */
  agentPath: string
  /** The directory in the agent's path where the agent's memories are stored. */
  memoriesDirectory?: string
  /** The filename of the file in the agent's memories directory where the last CID is stored. */
  lastMemoryCidFilename?: string
  /** The version identifier for the agent software. Defaults if not provided. */
  agentVersion?: string
}

/**
 * Comprehensive configuration options for the ExperienceManager.
 */
export type ExperienceManagerOptions = {
  /** Options for the AutoDrive API client. */
  autoDriveApiOptions: AutoDriveApiOptions
  /** Options for uploading experiences. */
  uploadOptions: ExperienceUploadOptions
  /** Options for EVM wallet and contract interactions. */
  walletOptions: EvmOptions
  /** Options related to the specific agent. */
  agentOptions: AgentOptions
}

/**
 * Interface for managing the storage and retrieval of the latest experience CID
 * for an agent, potentially involving on-chain interactions.
 */
export type CidManager = {
  /** Retrieves the last known CID for the agent's experience sequence. */
  getLastMemoryCid: () => Promise<string | undefined>
  /** Saves the given CID as the latest in the sequence, potentially via an EVM transaction. */
  saveLastMemoryCid: (cid: string) => Promise<ethers.TransactionReceipt | undefined>
  /** Provides status information about the local hash storage. */
  localHashStatus: { message: string }
}

/**
 * Interface for the main service responsible for saving and retrieving agent experiences.
 */
export type ExperienceManager = {
  /** Saves the provided agent data as a new experience, returning details about the save operation. */
  saveExperience: (data: unknown) => Promise<ExperienceSaveResult>
  /** Retrieves a specific agent experience object by its CID. */
  retrieveExperience: (cid: string) => Promise<AgentExperience | AgentExperienceV0>
  /** The underlying CidManager instance used for tracking the latest CID. */
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
