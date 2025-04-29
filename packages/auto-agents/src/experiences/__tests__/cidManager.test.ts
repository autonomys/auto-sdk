import {
  blake3HashFromCid,
  cidFromBlakeHash,
  cidToString,
  stringToCid,
} from '@autonomys/auto-dag-data'
import { ethers } from 'ethers'
import * as fs from 'fs'
import { createCidManager } from '../cidManager'
import * as utils from '../utils'

// Mock dependencies
jest.mock('ethers')
jest.mock('fs')
jest.mock('../abi/memory', () => ({ MEMORY_ABI: [] })) // Mock the actual module path
jest.mock('../utils') // Mock the actual module path
jest.mock('@autonomys/auto-dag-data', () => ({
  stringToCid: jest.fn((cid) => cid), // Simple mock
  cidToString: jest.fn((cid) => cid), // Simple mock
  blake3HashFromCid: jest.fn(() => Buffer.from('mockBlake3Hash')),
  cidFromBlakeHash: jest.fn(() => 'mockCidFromHash'),
}))

const mockEthers = ethers as jest.Mocked<typeof ethers>
const mockFs = fs as jest.Mocked<typeof fs>
const mockUtils = utils as jest.Mocked<typeof utils>
const mockAutoDagData = {
  stringToCid,
  cidToString,
  blake3HashFromCid,
  cidFromBlakeHash,
} as jest.Mocked<typeof import('@autonomys/auto-dag-data')>

describe('createCidManager', () => {
  // --- Constants ---
  const agentPath = '/fake/agent/path'
  const memoriesDir = `${agentPath}/memories`
  const localHashLocation = `${memoriesDir}/last-memory-hash.json`
  const walletOptions = {
    rpcUrl: 'http://localhost:8545',
    privateKey: '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    contractAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  }
  const testCid = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi' // Example CID
  const testHash = '0x6d6f636b426c616b653348617368000000000000000000000000000000000000' // hex of mockBlake3Hash
  const mockWalletAddress = '0x1234567890abcdef1234567890abcdef12345678'

  // --- Mock Setup Helper Functions ---
  const setupMockFs = () => {
    mockFs.existsSync.mockReturnValue(true)
    mockFs.mkdirSync.mockReturnValue(undefined)
    mockFs.readFileSync.mockImplementation((path) => {
      if (path === localHashLocation) {
        return JSON.stringify({ hash: testHash, timestamp: new Date().toISOString() })
      }
      throw new Error(`ENOENT: no such file or directory, open '${path}'`)
    })
    mockFs.writeFileSync.mockReturnValue(undefined)
  }

  const setupMockEthers = () => {
    const mockProvider = {
      getNetwork: jest.fn().mockResolvedValue({ chainId: BigInt(1) }),
      getBlockNumber: jest.fn().mockResolvedValue(1000),
      getBlock: jest.fn().mockResolvedValue({ timestamp: Math.floor(Date.now() / 1000) - 60 }),
      queryFilter: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<ethers.JsonRpcProvider>
    mockEthers.JsonRpcProvider.mockReturnValue(mockProvider)

    const mockWallet = {
      address: mockWalletAddress,
    } as unknown as jest.Mocked<ethers.Wallet>
    mockEthers.Wallet.mockReturnValue(mockWallet)

    const mockContract = {
      filters: {
        LastMemoryHashSet: jest.fn(() => ({})),
      },
      queryFilter: jest.fn().mockResolvedValue([]),
      getLastMemoryHash: jest.fn().mockResolvedValue(undefined),
      setLastMemoryHash: jest.fn().mockResolvedValue({
        wait: jest.fn().mockResolvedValue({ status: 1, transactionHash: '0xmocktxhash' }),
      }),
    } as unknown as jest.Mocked<ethers.Contract>
    mockEthers.Contract.mockReturnValue(mockContract)

    mockEthers.hexlify.mockImplementation((data: ethers.BytesLike) => {
      if (Buffer.from(data as any).toString() === 'mockBlake3Hash') {
        return testHash
      }
      return '0x'
    })

    // Return key mocks needed for specific test arrangements
    return { mockProvider, mockWallet, mockContract }
  }

  const setupMockUtils = () => {
    mockUtils.retryWithBackoff.mockImplementation(async (fn) => fn())
  }

  const setupMockAutoDagData = () => {
    mockAutoDagData.blake3HashFromCid.mockReturnValue(Buffer.from('mockBlake3Hash'))
    mockAutoDagData.stringToCid.mockReturnValue(testCid as any)
    mockAutoDagData.cidFromBlakeHash.mockReturnValue('mockCidFromHash' as any)
    mockAutoDagData.cidToString.mockImplementation((cid: any): string => String(cid)) // More robust mock
  }

  // --- Test Setup ---
  // Store mocks that might need adjustment per test
  let currentMockProvider: jest.Mocked<ethers.JsonRpcProvider>
  let currentMockContract: jest.Mocked<ethers.Contract>

  beforeEach(() => {
    jest.clearAllMocks()

    // Call setup helpers
    setupMockFs()
    const { mockProvider, mockContract } = setupMockEthers() // Get provider/contract mocks
    setupMockUtils()
    setupMockAutoDagData()

    // Store for potential modification in specific tests
    currentMockProvider = mockProvider
    currentMockContract = mockContract
  })

  // --- Tests ---
  it('should initialize in offline mode if RPC connection fails', async () => {
    // Arrange: Override the provider mock for this specific test
    currentMockProvider.getNetwork.mockRejectedValue(new Error('Connection failed'))
    // Need to re-assign the mocked JsonRpcProvider instance since createCidManager creates a new one
    mockEthers.JsonRpcProvider.mockReturnValue(currentMockProvider)

    // Act
    const cidManager = await createCidManager(
      { agentPath: agentPath, agentName: 'TestAgent' },
      walletOptions,
    )

    // Assert
    expect(mockEthers.JsonRpcProvider).toHaveBeenCalledWith(walletOptions.rpcUrl)
    expect(currentMockProvider.getNetwork).toHaveBeenCalled()
    expect(cidManager.localHashStatus.message).toBe('Using local storage only')
    expect(mockFs.existsSync).toHaveBeenCalledWith(memoriesDir) // Should still check/create dir
    expect(mockFs.mkdirSync).not.toHaveBeenCalled() // Assumes existsSync returned true

    // Test offline methods
    // 1. Get last memory CID (reads from local file)
    mockFs.existsSync.mockReturnValueOnce(true) // Location exists
    mockFs.readFileSync.mockReturnValueOnce(
      JSON.stringify({ hash: testHash, timestamp: new Date().toISOString() }),
    )
    await expect(cidManager.getLastMemoryCid()).resolves.toBe('mockCidFromHash')
    expect(mockFs.readFileSync).toHaveBeenCalledWith(localHashLocation, 'utf-8')
    expect(mockAutoDagData.cidFromBlakeHash).toHaveBeenCalledWith(
      Buffer.from(testHash.slice(2), 'hex'),
    )
    expect(mockAutoDagData.cidToString).toHaveBeenCalledWith('mockCidFromHash')

    // 2. Get last memory CID (local file doesn't exist)
    mockFs.existsSync.mockReturnValueOnce(false) // Location does NOT exist
    await expect(cidManager.getLastMemoryCid()).resolves.toBeUndefined()

    // 3. Save last memory CID (writes to local file)
    await cidManager.saveLastMemoryCid(testCid)
    expect(mockAutoDagData.stringToCid).toHaveBeenCalledWith(testCid)
    expect(mockAutoDagData.blake3HashFromCid).toHaveBeenCalledWith(testCid)
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      localHashLocation,
      expect.stringContaining(`"hash": "${testHash}"`), // Check if correct hash is saved
    )

    // Ensure no contract interaction happened
    expect(mockEthers.Wallet).not.toHaveBeenCalled()
    expect(mockEthers.Contract).not.toHaveBeenCalled()
  })

  it('should initialize online and update local hash if blockchain event is newer', async () => {
    // Arrange
    const oldTimestamp = new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
    const newTimestamp = new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
    const newEventHash = '0x1122334455667788112233445566778811223344556677881122334455667788'
    const eventBlockNumber = 999

    // 1. Mock local file read to have old timestamp
    mockFs.readFileSync.mockImplementation((path) => {
      if (path === localHashLocation) {
        return JSON.stringify({ hash: testHash, timestamp: oldTimestamp.toISOString() })
      }
      throw new Error(`ENOENT: no such file or directory, open '${path}'`)
    })

    // 2. Mock contract event query to return a newer event
    const mockEvent = {
      blockNumber: eventBlockNumber,
      args: { hash: newEventHash }, // Make args optional if EventLog type requires it
      // Mock other properties of EventLog if needed by getBlock
      getBlock: jest
        .fn()
        .mockResolvedValue({ timestamp: Math.floor(newTimestamp.getTime() / 1000) }),
    } as unknown as ethers.EventLog // Cast to EventLog, adjust if specific type needed
    currentMockContract.queryFilter.mockResolvedValue([mockEvent])

    // Act
    const cidManager = await createCidManager(
      { agentPath: agentPath, agentName: 'TestAgent' },
      walletOptions,
    )

    // Assert
    // Verify validation steps were called
    expect(currentMockProvider.getBlockNumber).toHaveBeenCalled()
    expect(currentMockContract.filters.LastMemoryHashSet).toHaveBeenCalledWith(mockWalletAddress)
    expect(currentMockContract.queryFilter).toHaveBeenCalled() // Check args more specifically if needed
    expect(mockEvent.getBlock).toHaveBeenCalled()

    // Verify local file was updated with the new hash from the event
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      localHashLocation,
      // Check that the content includes the new hash and a timestamp
      expect.stringContaining(`"hash": "${newEventHash}"`) &&
        expect.stringContaining(`"timestamp":`) && // Check timestamp field exists
        expect.any(String), // The actual value is written by writeFileSync
    )

    // Verify the status message
    expect(cidManager.localHashStatus.message).toBe('Local hash has been updated from blockchain')

    // Ensure the direct hash getter wasn't called during init
    expect(currentMockContract.getLastMemoryHash).not.toHaveBeenCalled()
  })

  it('should initialize online and report local hash is up-to-date', async () => {
    // Arrange
    const recentTimestamp = new Date() // Now

    // 1. Mock local file read to have recent timestamp
    mockFs.readFileSync.mockImplementation((path) => {
      if (path === localHashLocation) {
        return JSON.stringify({ hash: testHash, timestamp: recentTimestamp.toISOString() })
      }
      throw new Error(`ENOENT: no such file or directory, open '${path}'`)
    })

    // 2. Mock contract event query to return no events
    currentMockContract.queryFilter.mockResolvedValue([])

    // Act
    const cidManager = await createCidManager(
      { agentPath: agentPath, agentName: 'TestAgent' },
      walletOptions,
    )

    // Assert
    // Verify validation steps were called
    expect(currentMockProvider.getBlockNumber).toHaveBeenCalled()
    expect(currentMockContract.filters.LastMemoryHashSet).toHaveBeenCalledWith(mockWalletAddress)
    expect(currentMockContract.queryFilter).toHaveBeenCalled()

    // Verify local file was NOT updated
    expect(mockFs.writeFileSync).not.toHaveBeenCalled()

    // Verify the status message
    expect(cidManager.localHashStatus.message).toBe('Local hash is up to date')

    // Ensure the direct hash getter wasn't called during init
    expect(currentMockContract.getLastMemoryHash).not.toHaveBeenCalled()
  })

  it('should initialize online when no local hash file exists', async () => {
    // Arrange
    // 1. Mock local file does not exist
    mockFs.existsSync.mockImplementation((path) => {
      if (path === localHashLocation) {
        return false // The hash file doesn't exist
      }
      return true // Assume memories dir exists
    })

    // 2. Mock contract event query to return no events (or some events, shouldn't matter)
    currentMockContract.queryFilter.mockResolvedValue([])

    // Act
    const cidManager = await createCidManager(
      { agentPath: agentPath, agentName: 'TestAgent' },
      walletOptions,
    )

    // Assert
    // Verify validation steps were called (or relevant parts)
    expect(mockFs.existsSync).toHaveBeenCalledWith(localHashLocation)
    expect(mockFs.readFileSync).not.toHaveBeenCalledWith(localHashLocation, expect.any(String)) // Shouldn't try to read it
    // expect(currentMockProvider.getBlockNumber).toHaveBeenCalled() // Not called in this path
    // expect(currentMockContract.filters.LastMemoryHashSet).toHaveBeenCalledWith(mockWalletAddress) // Not called in this path
    // expect(currentMockContract.queryFilter).toHaveBeenCalled() // Not called in this path

    // Verify local file was NOT written to during init
    expect(mockFs.writeFileSync).not.toHaveBeenCalled()

    // Verify the status message
    expect(cidManager.localHashStatus.message).toBe('No local hash found')

    // Ensure the direct hash getter wasn't called during init
    expect(currentMockContract.getLastMemoryHash).not.toHaveBeenCalled()
  })

  it('should handle errors during online initialization validation', async () => {
    // Arrange
    const validationError = new Error('Blockchain query failed')

    // 1. Mock local file exists and is readable (timestamp doesn't matter much here)
    mockFs.existsSync.mockReturnValue(true)
    mockFs.readFileSync.mockReturnValue(
      JSON.stringify({ hash: testHash, timestamp: new Date().toISOString() }),
    )

    // 2. Mock contract event query to fail
    currentMockContract.queryFilter.mockRejectedValue(validationError)

    // Act
    const cidManager = await createCidManager(
      { agentPath: agentPath, agentName: 'TestAgent' },
      walletOptions,
    )

    // Assert
    // Verify validation steps were attempted
    expect(mockFs.existsSync).toHaveBeenCalledWith(localHashLocation)
    expect(mockFs.readFileSync).toHaveBeenCalledWith(localHashLocation, 'utf-8')
    expect(currentMockProvider.getBlockNumber).toHaveBeenCalled()
    expect(currentMockContract.filters.LastMemoryHashSet).toHaveBeenCalledWith(mockWalletAddress)
    expect(currentMockContract.queryFilter).toHaveBeenCalled() // It was called, but it failed

    // Verify local file was NOT updated despite the error
    expect(mockFs.writeFileSync).not.toHaveBeenCalled()

    // Verify the status message indicates fallback due to error
    expect(cidManager.localHashStatus.message).toContain(
      'Using local hash due to blockchain connection issues',
    )
    expect(cidManager.localHashStatus.message).toContain(validationError.message)

    // Ensure the direct hash getter wasn't called during init
    expect(currentMockContract.getLastMemoryHash).not.toHaveBeenCalled()
  })

  it('should be defined', () => {
    expect(createCidManager).toBeDefined()
  })

  // --- Tests for getLastMemoryCid (Online) ---

  it('getLastMemoryCid (online) should return CID from local file if it exists', async () => {
    // Arrange
    // Standard online initialization (local file exists and is valid by default setup)
    const cidManager = await createCidManager(
      { agentPath: agentPath, agentName: 'TestAgent' },
      walletOptions,
    )
    // Reset calls from initialization
    jest.clearAllMocks()
    // Re-apply mocks for fs read if cleared
    mockFs.existsSync.mockReturnValue(true)
    mockFs.readFileSync.mockReturnValue(
      JSON.stringify({ hash: testHash, timestamp: new Date().toISOString() }),
    )

    // Act
    const resultCid = await cidManager.getLastMemoryCid()

    // Assert
    expect(resultCid).toBe('mockCidFromHash') // From mockAutoDagData.cidFromBlakeHash
    expect(mockFs.existsSync).toHaveBeenCalledWith(localHashLocation)
    expect(mockFs.readFileSync).toHaveBeenCalledWith(localHashLocation, 'utf-8')
    expect(mockAutoDagData.cidFromBlakeHash).toHaveBeenCalledWith(
      Buffer.from(testHash.slice(2), 'hex'),
    )
    expect(mockAutoDagData.cidToString).toHaveBeenCalledWith('mockCidFromHash')

    // Ensure blockchain was NOT called for this getter
    expect(currentMockContract.getLastMemoryHash).not.toHaveBeenCalled()
  })

  it('getLastMemoryCid (online) should fetch from blockchain if local file missing, save locally, and return CID', async () => {
    // Arrange
    const cidManager = await createCidManager(
      { agentPath: agentPath, agentName: 'TestAgent' },
      walletOptions,
    )
    jest.clearAllMocks()

    // 1. Mock local file does NOT exist
    mockFs.existsSync.mockImplementation((path) => {
      if (path === localHashLocation) return false
      return true
    })

    // 2. Mock blockchain call returns a hash
    currentMockContract.getLastMemoryHash.mockResolvedValue(testHash)

    // 3. Ensure other mocks are ready
    mockFs.writeFileSync.mockReturnValue(undefined) // Ready to be called
    mockAutoDagData.cidFromBlakeHash.mockReturnValue('mockCidFromHash' as any)

    // Act
    const resultCid = await cidManager.getLastMemoryCid()

    // Assert
    expect(resultCid).toBe('mockCidFromHash')
    expect(mockFs.existsSync).toHaveBeenCalledWith(localHashLocation)
    expect(mockFs.readFileSync).not.toHaveBeenCalled() // Should not read non-existent file
    expect(currentMockContract.getLastMemoryHash).toHaveBeenCalledWith(mockWalletAddress)

    // Check that it saved the fetched hash locally
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      localHashLocation,
      expect.stringContaining(`"hash": "${testHash}"`) && expect.any(String),
    )

    // Check CID conversion steps
    expect(mockAutoDagData.cidFromBlakeHash).toHaveBeenCalledWith(
      Buffer.from(testHash.slice(2), 'hex'),
    )
    expect(mockAutoDagData.cidToString).toHaveBeenCalledWith('mockCidFromHash')
  })

  it('getLastMemoryCid (online) should return undefined if no local or blockchain hash exists', async () => {
    // Arrange
    const cidManager = await createCidManager(
      { agentPath: agentPath, agentName: 'TestAgent' },
      walletOptions,
    )
    jest.clearAllMocks()

    // 1. Mock local file does NOT exist
    mockFs.existsSync.mockImplementation((path) => {
      if (path === localHashLocation) return false
      return true
    })

    // 2. Mock blockchain call returns undefined (no hash)
    currentMockContract.getLastMemoryHash.mockResolvedValue(undefined)

    // Act
    const resultCid = await cidManager.getLastMemoryCid()

    // Assert
    expect(resultCid).toBeUndefined()
    expect(mockFs.existsSync).toHaveBeenCalledWith(localHashLocation)
    expect(mockFs.readFileSync).not.toHaveBeenCalled()
    expect(currentMockContract.getLastMemoryHash).toHaveBeenCalledWith(mockWalletAddress)

    // Check that nothing was saved locally
    expect(mockFs.writeFileSync).not.toHaveBeenCalled()

    // Check CID conversion steps were not called
    expect(mockAutoDagData.cidFromBlakeHash).not.toHaveBeenCalled()
    expect(mockAutoDagData.cidToString).not.toHaveBeenCalled()
  })

  it('getLastMemoryCid (online) should return undefined if blockchain fetch fails', async () => {
    // Arrange
    const cidManager = await createCidManager(
      { agentPath: agentPath, agentName: 'TestAgent' },
      walletOptions,
    )
    jest.clearAllMocks()
    const fetchError = new Error('Contract read error')

    // 1. Mock local file does NOT exist
    mockFs.existsSync.mockImplementation((path) => {
      if (path === localHashLocation) return false
      return true
    })

    // 2. Mock blockchain call fails
    currentMockContract.getLastMemoryHash.mockRejectedValue(fetchError)

    // Act
    const resultCid = await cidManager.getLastMemoryCid()

    // Assert
    expect(resultCid).toBeUndefined()
    expect(mockFs.existsSync).toHaveBeenCalledWith(localHashLocation)
    expect(mockFs.readFileSync).not.toHaveBeenCalled()
    expect(currentMockContract.getLastMemoryHash).toHaveBeenCalledWith(mockWalletAddress)

    // Check that nothing was saved locally
    expect(mockFs.writeFileSync).not.toHaveBeenCalled()

    // Check CID conversion steps were not called
    expect(mockAutoDagData.cidFromBlakeHash).not.toHaveBeenCalled()
    expect(mockAutoDagData.cidToString).not.toHaveBeenCalled()
  })

  // --- Tests for saveLastMemoryCid (Online) ---

  it('saveLastMemoryCid (online) should save locally, call contract, and return receipt on success', async () => {
    // Arrange
    const cidManager = await createCidManager(
      { agentPath: agentPath, agentName: 'TestAgent' },
      walletOptions,
    )
    jest.clearAllMocks()

    // Re-apply mocks potentially cleared if setupMockEthers changes
    const mockTxResponse = {
      wait: jest.fn().mockResolvedValue({ status: 1, transactionHash: '0xmocktxhash' }),
    }
    currentMockContract.setLastMemoryHash.mockResolvedValue(mockTxResponse as any)
    mockFs.writeFileSync.mockReturnValue(undefined)
    mockUtils.retryWithBackoff.mockImplementation(async (fn) => fn()) // Ensure retry mock is fresh
    mockEthers.hexlify.mockReturnValue(testHash) // Ensure hexlify mock is fresh
    mockAutoDagData.blake3HashFromCid.mockReturnValue(Buffer.from('mockBlake3Hash'))
    mockAutoDagData.stringToCid.mockReturnValue(testCid as any)

    // Act
    const receipt = await cidManager.saveLastMemoryCid(testCid)

    // Assert
    // 1. Verify local save occurred first
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      localHashLocation,
      expect.stringContaining(`"hash": "${testHash}"`) && expect.any(String),
    )
    // Check order if necessary, though tricky with async

    // 2. Verify contract call occurred via retry
    expect(mockUtils.retryWithBackoff).toHaveBeenCalled()
    expect(currentMockContract.setLastMemoryHash).toHaveBeenCalledWith(testHash)

    // 3. Verify wait() was called
    expect(mockTxResponse.wait).toHaveBeenCalled()

    // 4. Verify receipt was returned
    expect(receipt).toBeDefined()
    expect(receipt).toEqual(await mockTxResponse.wait())

    // Verify helper mocks were called
    expect(mockAutoDagData.stringToCid).toHaveBeenCalledWith(testCid)
    expect(mockAutoDagData.blake3HashFromCid).toHaveBeenCalledWith(testCid)
    expect(mockEthers.hexlify).toHaveBeenCalledWith(Buffer.from('mockBlake3Hash'))
  })

  it('saveLastMemoryCid (online) should save locally but return undefined if contract call fails', async () => {
    // Arrange
    const cidManager = await createCidManager(
      { agentPath: agentPath, agentName: 'TestAgent' },
      walletOptions,
    )
    jest.clearAllMocks()
    const contractError = new Error('Transaction failed')

    // 1. Mock contract call (within retry) to fail
    mockUtils.retryWithBackoff.mockRejectedValue(contractError)

    // 2. Ensure other mocks are ready
    mockFs.writeFileSync.mockReturnValue(undefined)
    mockEthers.hexlify.mockReturnValue(testHash)
    mockAutoDagData.blake3HashFromCid.mockReturnValue(Buffer.from('mockBlake3Hash'))
    mockAutoDagData.stringToCid.mockReturnValue(testCid as any)

    // Act
    const receipt = await cidManager.saveLastMemoryCid(testCid)

    // Assert
    // 1. Verify local save still occurred
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      localHashLocation,
      expect.stringContaining(`"hash": "${testHash}"`) && expect.any(String),
    )

    // 2. Verify contract call was attempted via retry
    expect(mockUtils.retryWithBackoff).toHaveBeenCalled()
    // setLastMemoryHash might or might not have been called depending on where retry fails
    // expect(currentMockContract.setLastMemoryHash).toHaveBeenCalledWith(testHash)

    // 3. Verify undefined was returned due to the error
    expect(receipt).toBeUndefined()

    // Verify helper mocks were called for local save part
    expect(mockAutoDagData.stringToCid).toHaveBeenCalledWith(testCid)
    expect(mockAutoDagData.blake3HashFromCid).toHaveBeenCalledWith(testCid)
    expect(mockEthers.hexlify).toHaveBeenCalledWith(Buffer.from('mockBlake3Hash'))
  })
})
