import { createAutoDriveApi, type AutoDriveApi } from '@autonomys/auto-drive'
import { ethers } from 'ethers'
import { createCidManager } from '../cidManager'
import { createExperienceManager } from '../experienceManager'
import { downloadExperience, uploadExperience } from '../experienceStorage'
import type { CidManager, ExperienceManagerOptions } from '../types'

jest.mock('@autonomys/auto-dag-data', () => ({
  stringToCid: jest.fn((cid) => cid),
  cidToString: jest.fn((cid) => cid),
  blake3HashFromCid: jest.fn(() => Buffer.from('mockBlake3Hash')),
  cidFromBlakeHash: jest.fn(() => 'mockCidFromHash'),
}))
jest.mock('@autonomys/auto-drive', () => ({
  createAutoDriveApi: jest.fn(),
}))
jest.mock('ethers')
jest.mock('../cidManager', () => ({
  createCidManager: jest.fn(),
}))
jest.mock('../experienceStorage', () => ({
  uploadExperience: jest.fn(),
  downloadExperience: jest.fn(),
}))

describe('experienceManager', () => {
  const mockCreateAutoDriveApi = createAutoDriveApi as jest.Mock
  const mockCreateCidManager = createCidManager as jest.Mock
  const mockUploadExperience = uploadExperience as jest.Mock
  const mockDownloadExperience = downloadExperience as jest.Mock

  const mockCidManager: jest.Mocked<CidManager> = {
    localHashStatus: { message: 'ok' },
    getLastMemoryCid: jest.fn(),
    saveLastMemoryCid: jest.fn(),
  }

  const managerOptions: ExperienceManagerOptions = {
    autoDriveApiOptions: { apiKey: 'test-api-key', network: 'taurus' },
    walletOptions: {
      privateKey: '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    },
    agentOptions: {
      agentName: 'AutonomousAgent',
      agentVersion: '2.0.0',
      agentPath: '/fake/agent/path',
    },
    uploadOptions: { compression: true },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateCidManager.mockResolvedValue(mockCidManager)
    mockCreateAutoDriveApi.mockReturnValue({} as AutoDriveApi)
  })

  it('should initialize ExperienceManager with CidManager and AutoDriveApi', async () => {
    const manager = await createExperienceManager(managerOptions)
    expect(manager).toBeDefined()
    expect(manager.cidManager).toBe(mockCidManager)
    expect(mockCreateAutoDriveApi).toHaveBeenCalledWith(managerOptions.autoDriveApiOptions)
    expect(mockCreateCidManager).toHaveBeenCalledWith(
      managerOptions.agentOptions,
      managerOptions.walletOptions,
    )
  })

  describe('saveExperience', () => {
    it('should save experience, update CidManager, and return result', async () => {
      mockCidManager.getLastMemoryCid.mockResolvedValue('bafybeipreviouscid')
      mockUploadExperience.mockResolvedValue('bafybeinewcid')
      mockCidManager.saveLastMemoryCid.mockResolvedValue({
        hash: '0xtransactionhash',
      } as unknown as ethers.TransactionReceipt)

      const manager = await createExperienceManager(managerOptions)
      const data = { notes: 'first experience' }
      const result = await manager.saveExperience(data)

      expect(result).toEqual({
        cid: 'bafybeinewcid',
        previousCid: 'bafybeipreviouscid',
        evmHash: '0xtransactionhash',
      })

      expect(mockUploadExperience).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          agentName: 'AutonomousAgent',
          agentVersion: '2.0.0',
          previousCid: 'bafybeipreviouscid',
        }),
        data,
        managerOptions.uploadOptions,
      )
      expect(mockCidManager.saveLastMemoryCid).toHaveBeenCalledWith('bafybeinewcid')
    })

    it('should fallback to agentVersion "unknown" if agentVersion is empty', async () => {
      const customOptions: ExperienceManagerOptions = {
        ...managerOptions,
        agentOptions: {
          agentName: 'NoVersionAgent',
          agentPath: '/path',
        },
      }
      mockCidManager.getLastMemoryCid.mockResolvedValue(undefined)
      mockUploadExperience.mockResolvedValue('bafybeicid')
      mockCidManager.saveLastMemoryCid.mockResolvedValue(undefined)

      const manager = await createExperienceManager(customOptions)
      await manager.saveExperience({ test: true })

      expect(mockUploadExperience).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          agentVersion: 'unknown',
          previousCid: undefined,
        }),
        expect.anything(),
        customOptions.uploadOptions,
      )
    })
  })

  describe('retrieveExperience', () => {
    it('should retrieve experience from AutoDrive', async () => {
      const expectedData = { header: {}, data: { mood: 'happy' }, signature: '0x' }
      mockDownloadExperience.mockResolvedValue(expectedData)

      const manager = await createExperienceManager(managerOptions)
      const experience = await manager.retrieveExperience('bafybeicid')

      expect(experience).toEqual(expectedData)
      expect(mockDownloadExperience).toHaveBeenCalledWith(expect.anything(), 'bafybeicid')
    })

    it('should not retry if error is "Not Found"', async () => {
      mockDownloadExperience.mockRejectedValue(new Error('File Not Found'))

      const manager = await createExperienceManager(managerOptions)
      await expect(manager.retrieveExperience('bafybeinonexistent')).rejects.toThrow(
        'File Not Found',
      )
      expect(mockDownloadExperience).toHaveBeenCalledTimes(1)
    })

    it('should not retry if error is "incorrect header check"', async () => {
      mockDownloadExperience.mockRejectedValue(new Error('zlib: incorrect header check'))

      const manager = await createExperienceManager(managerOptions)
      await expect(manager.retrieveExperience('bafybeicorrupt')).rejects.toThrow(
        'zlib: incorrect header check',
      )
      expect(mockDownloadExperience).toHaveBeenCalledTimes(1)
    })
  })
})
