import {
  blake3HashFromCid,
  cidFromBlakeHash,
  cidToString,
  stringToCid,
} from '@autonomys/auto-dag-data'
import { ethers } from 'ethers'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { MEMORY_ABI } from './abi/memory.js'
import type { AgentOptions, CidManager, EvmOptions, StoredHash } from './types.js'
import { retryWithBackoff } from './utils.js'

/**
 * Converts a bytes32 hex string (presumed Blake3 hash) from the contract to a CID string.
 * @param hash The bytes32 hex string hash (e.g., "0x...").
 * @returns The corresponding CID string.
 */
const hashToCid = (hash: string): string => {
  const hashBuffer = Buffer.from(hash.slice(2), 'hex')
  const cid = cidFromBlakeHash(hashBuffer)
  return cidToString(cid)
}

/**
 * Saves a hash and the current timestamp to a local file.
 * @param hash The hash string to save (typically a bytes32 hex string).
 * @param location The full file path where the hash should be saved.
 * @throws If writing to the file fails.
 */
const saveHashLocally = (hash: string, location: string): void => {
  try {
    const data: StoredHash = {
      hash,
      timestamp: new Date().toISOString(),
    }
    writeFileSync(location, JSON.stringify(data, null, 2))
  } catch (error) {
    throw new Error(`Failed to save hash locally:${error}`)
  }
}

/**
 * Retrieves the hash stored locally in a file.
 * @param location The full file path where the hash is stored.
 * @returns The stored hash string, or undefined if the file doesn't exist.
 * @throws If reading or parsing the file fails.
 */
const getLocalHash = (location: string): string | undefined => {
  try {
    if (!existsSync(location)) {
      return undefined
    }
    const data = JSON.parse(readFileSync(location, 'utf-8')) as StoredHash
    return data.hash
  } catch (error) {
    throw new Error(`Failed to get local hash:${error}`)
  }
}

/**
 * Queries the blockchain for the timestamp and hash of the last `LastMemoryHashSet` event
 * emitted for a specific wallet address.
 * @param provider An initialized ethers JsonRpcProvider.
 * @param contract An initialized ethers Contract instance for the memory contract.
 * @param walletAddress The address whose events are being queried.
 * @returns An object containing the timestamp (in seconds) and hash of the last event, or { timestamp: 0, hash: '' } if no events found.
 * @throws If querying events or blocks fails.
 */
const getLastMemoryHashSetTimestamp = async (
  provider: ethers.JsonRpcProvider,
  contract: ethers.Contract,
  walletAddress: string,
): Promise<{ timestamp: number; hash: string }> => {
  try {
    const currentBlock = await provider.getBlockNumber()
    // Look back a reasonable number of blocks for the event
    const fromBlock = Math.max(0, currentBlock - 5000)

    const filter = contract.filters.LastMemoryHashSet(walletAddress)
    const events = await contract.queryFilter(filter, fromBlock, currentBlock)

    if (events.length === 0) {
      return { timestamp: 0, hash: '' }
    }
    const lastEvent = events[events.length - 1]
    const block = await lastEvent.getBlock()

    return {
      timestamp: block.timestamp,
      hash: (lastEvent as ethers.EventLog).args.hash,
    }
  } catch (error) {
    throw new Error(`Failed to get last memory hash:${error}`)
  }
}

/**
 * Validates the locally stored hash against the latest hash stored on the blockchain.
 * Updates the local hash if the blockchain version is newer.
 * @param provider An initialized ethers JsonRpcProvider.
 * @param contract An initialized ethers Contract instance for the memory contract.
 * @param walletAddress The address whose hash is being validated.
 * @param location The full file path where the local hash is stored.
 * @returns An object with a message indicating the status of the local hash.
 */
const validateLocalHash = async (
  provider: ethers.JsonRpcProvider,
  contract: ethers.Contract,
  walletAddress: string,
  location: string,
): Promise<{ message: string }> => {
  try {
    const localHash = getLocalHash(location)
    if (!localHash) {
      return { message: 'No local hash found' }
    }

    const { timestamp: eventTimestamp, hash: eventHash } = await getLastMemoryHashSetTimestamp(
      provider,
      contract,
      walletAddress,
    )
    const localTimestamp =
      new Date(JSON.parse(readFileSync(location, 'utf-8')).timestamp).getTime() / 1000

    if (eventTimestamp > localTimestamp) {
      saveHashLocally(eventHash, location)
      return { message: 'Local hash has been updated from blockchain' }
    }
    return { message: 'Local hash is up to date' }
  } catch (error) {
    return { message: `Using local hash due to blockchain connection issues. Error:${error}` }
  }
}

/**
 * Creates and initializes a CidManager instance.
 * This manager handles retrieving and saving the latest experience CID for an agent,
 * coordinating between local file storage and blockchain storage.
 * If blockchain connection fails during initialization, it falls back to an offline-only mode.
 *
 * @param agentOptions Configuration options for the agent, including paths.
 * @param agentOptions.agentPath Base path for the agent's data.
 * @param agentOptions.memoriesDirectory Optional subdirectory for memory files (defaults to 'memories').
 * @param agentOptions.lastMemoryCidFilename Optional filename for the last hash file (defaults to 'last-memory-hash.json').
 * @param walletOptions Configuration for EVM wallet and contract interaction.
 * @returns A Promise that resolves to a CidManager instance.
 */
export const createCidManager = async (
  {
    agentPath,
    memoriesDirectory = 'memories',
    lastMemoryCidFilename = 'last-memory-hash.json',
  }: AgentOptions,
  walletOptions: EvmOptions,
): Promise<CidManager> => {
  const memoriesPath = join(agentPath, memoriesDirectory)
  const localHashLocation = join(memoriesPath, lastMemoryCidFilename)

  if (!existsSync(memoriesPath)) {
    mkdirSync(memoriesPath, { recursive: true })
  }

  // Helper function to create offline-only implementation
  const createOfflineImplementation = (message: string): CidManager => {
    return {
      localHashStatus: { message },
      getLastMemoryCid: async () => {
        const localHash = getLocalHash(localHashLocation)
        return localHash ? hashToCid(localHash) : undefined
      },
      saveLastMemoryCid: async (cid: string) => {
        const blake3hash = blake3HashFromCid(stringToCid(cid))
        const bytes32Hash = ethers.hexlify(blake3hash)
        saveHashLocally(bytes32Hash, localHashLocation)
        return undefined
      },
    }
  }

  // Return offline-only implementation if contractInfo is undefined
  if (!walletOptions.contractInfo) {
    return createOfflineImplementation('Using local storage only - No contract info provided')
  }

  let provider
  try {
    provider = new ethers.JsonRpcProvider(walletOptions.contractInfo.rpcUrl)
    await provider.getNetwork() // Test connection
  } catch {
    // Return offline-only implementation if provider fails
    return createOfflineImplementation('Using local storage only - Provider connection failed')
  }

  const wallet = new ethers.Wallet(walletOptions.privateKey, provider)
  const contract = new ethers.Contract(
    walletOptions.contractInfo.contractAddress,
    MEMORY_ABI,
    wallet,
  )

  const localHashStatus = await validateLocalHash(
    provider,
    contract,
    wallet.address,
    localHashLocation,
  )

  const getLastMemoryCid = async (): Promise<string | undefined> => {
    const localHash = getLocalHash(localHashLocation)
    if (localHash) {
      return hashToCid(localHash)
    }

    try {
      const blockchainHash = await contract.getLastMemoryHash(wallet.address)
      if (blockchainHash) {
        saveHashLocally(blockchainHash, localHashLocation)
        return hashToCid(blockchainHash)
      }
    } catch {
      return undefined
    }
  }

  /**
   * Saves the given CID as the latest memory.
   * Converts CID to bytes32 hash, saves it locally first, then attempts to save on-chain via a transaction.
   * Uses retry logic for the blockchain transaction.
   */
  const saveLastMemoryCid = async (cid: string): Promise<ethers.TransactionReceipt | undefined> => {
    const blake3hash = blake3HashFromCid(stringToCid(cid))
    const bytes32Hash = ethers.hexlify(blake3hash)

    // Save locally first
    saveHashLocally(bytes32Hash, localHashLocation)

    try {
      const tx = await retryWithBackoff(
        () => contract.setLastMemoryHash(bytes32Hash) as Promise<ethers.TransactionResponse>,
        { timeout: 60000 },
      )
      // Wait for the transaction to be mined
      const receipt = (await tx.wait()) as ethers.TransactionReceipt
      return receipt
    } catch {
      return undefined
    }
  }

  return {
    localHashStatus,
    getLastMemoryCid,
    saveLastMemoryCid,
  }
}
