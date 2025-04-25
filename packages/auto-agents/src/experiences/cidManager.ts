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
import { CidManager, EvmOptions, StoredHash } from './types.js'
import { retryWithBackoff } from './utils.js'

const hashToCid = (hash: string): string => {
  const hashBuffer = Buffer.from(hash.slice(2), 'hex')
  const cid = cidFromBlakeHash(hashBuffer)
  return cidToString(cid)
}

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

const getLastMemoryHashSetTimestamp = async (
  provider: ethers.JsonRpcProvider,
  contract: ethers.Contract,
  walletAddress: string,
): Promise<{ timestamp: number; hash: string }> => {
  try {
    const currentBlock = await provider.getBlockNumber()
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

export const createCidManager = async (
  agentPath: string,
  walletOptions: EvmOptions,
): Promise<CidManager> => {
  const memoriesDir = join(agentPath, 'memories')
  const localHashLocation = join(memoriesDir, 'last-memory-hash.json')

  if (!existsSync(memoriesDir)) {
    mkdirSync(memoriesDir, { recursive: true })
  }

  let provider
  try {
    provider = new ethers.JsonRpcProvider(walletOptions.rpcUrl)
    await provider.getNetwork() // Test connection
  } catch {
    // Return offline-only implementation if provider fails
    return {
      localHashStatus: { message: 'Using local storage only' },
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

  const wallet = new ethers.Wallet(walletOptions.privateKey, provider)
  const contract = new ethers.Contract(walletOptions.contractAddress, MEMORY_ABI, wallet)

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
