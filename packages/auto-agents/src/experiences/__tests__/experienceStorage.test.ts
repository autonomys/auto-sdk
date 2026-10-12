import type { AutoDriveApi } from '@autonomys/auto-drive'
import { ethers } from 'ethers'
import { downloadExperience, uploadExperience } from '../experienceStorage'
import type { ExperienceHeader } from '../types'

describe('experienceStorage', () => {
  const mockWallet = {
    signMessage: jest.fn().mockResolvedValue('0xvalidsignature'),
  } as unknown as ethers.Wallet

  const mockAutoDriveApi = {
    uploadObjectAsJSON: jest.fn().mockResolvedValue('bafybeimockcid123'),
    downloadFile: jest.fn(),
  } as unknown as jest.Mocked<AutoDriveApi>

  const sampleHeader: ExperienceHeader = {
    agentName: 'Agent007',
    agentVersion: '1.0.0',
    timestamp: '2026-10-12T12:00:00.000Z',
    previousCid: 'bafybeipreviouscid',
  }

  const sampleData = {
    state: 'active',
    balance: BigInt('5000000000000000000'), // BigInt testing
    memoryKeys: ['task1', 'task2'],
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('uploadExperience', () => {
    it('should sign and upload experience object, serializing BigInt safely', async () => {
      const cid = await uploadExperience(mockAutoDriveApi, mockWallet, sampleHeader, sampleData, {
        compression: true,
        password: 'secure-password',
      })

      expect(cid).toBe('bafybeimockcid123')
      expect(mockWallet.signMessage).toHaveBeenCalled()

      // Verify signed payload contained serialized BigInt
      const signedMessageArg = (mockWallet.signMessage as jest.Mock).mock.calls[0][0]
      expect(signedMessageArg).toContain('"5000000000000000000"')

      const expectedFileName = 'Agent007-agent-1.0.0-memory-2026-10-12T12:00:00.000Z.json'
      expect(mockAutoDriveApi.uploadObjectAsJSON).toHaveBeenCalledWith(
        {
          header: sampleHeader,
          data: sampleData,
          signature: '0xvalidsignature',
        },
        expectedFileName,
        {
          compression: true,
          password: 'secure-password',
        },
      )
    })

    it('should default to empty options if uploadOptions is undefined', async () => {
      const cid = await uploadExperience(mockAutoDriveApi, mockWallet, sampleHeader, {
        message: 'hello',
      })

      expect(cid).toBe('bafybeimockcid123')
      expect(mockAutoDriveApi.uploadObjectAsJSON).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(String),
        {
          compression: undefined,
          password: undefined,
        },
      )
    })
  })

  describe('downloadExperience', () => {
    it('should download and parse experience JSON from async stream', async () => {
      const expectedExperience = {
        header: sampleHeader,
        data: { message: 'downloaded test' },
        signature: '0xsig',
      }

      const jsonBuffer = Buffer.from(JSON.stringify(expectedExperience))
      // Mock stream chunks
      async function* mockStream() {
        yield jsonBuffer.subarray(0, 10)
        yield jsonBuffer.subarray(10)
      }

      ;(mockAutoDriveApi.downloadFile as jest.Mock).mockResolvedValue(mockStream())

      const result = await downloadExperience(mockAutoDriveApi, 'bafybeimockcid123')
      expect(result).toEqual(expectedExperience)
      expect(mockAutoDriveApi.downloadFile).toHaveBeenCalledWith('bafybeimockcid123')
    })
  })
})
