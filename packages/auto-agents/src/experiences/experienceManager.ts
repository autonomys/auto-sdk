import { createAutoDriveApi } from '@autonomys/auto-drive'
import { ethers } from 'ethers'
import { createCidManager } from './cidManager.js'
import { downloadExperience, uploadExperience } from './experienceStorage.js'
import { ExperienceManager, ExperienceManagerOptions, ExperienceSaveResult } from './types.js'
import { retryWithBackoff } from './utils.js'

/**
 * Creates an ExperienceManager instance for saving and retrieving agent experiences.
 *
 * This manager handles:
 * - Uploading experience data (header + custom data) to AutoDrive, signed by the agent's wallet.
 * - Downloading experience data from AutoDrive using a CID.
 * - Managing the CID of the latest saved experience using CidManager (local cache + EVM storage).
 *
 * @param options - Configuration options for AutoDrive, wallet, agent details, and upload settings.
 * @returns A Promise that resolves to an ExperienceManager instance.
 */
export const createExperienceManager = async ({
  autoDriveApiOptions,
  uploadOptions,
  walletOptions,
  agentOptions,
}: ExperienceManagerOptions): Promise<ExperienceManager> => {
  const autoDriveApi = createAutoDriveApi(autoDriveApiOptions)
  const wallet = new ethers.Wallet(walletOptions.privateKey)
  const cidManager = await createCidManager(agentOptions, walletOptions)

  /**
   * Saves the provided agent experience data.
   *
   * 1. Gets the CID of the previous experience (if any) from CidManager.
   * 2. Constructs a header including agent info, timestamp, and previous CID.
   * 3. Uploads the header and data as a signed JSON object to AutoDrive.
   * 4. Saves the new CID using CidManager (updates local cache and EVM).
   *
   * @param data - The arbitrary data representing the agent's experience state.
   * @returns An object containing the new CID, the previous CID, and the EVM transaction hash (if successful).
   */
  const saveExperience = async (data: unknown): Promise<ExperienceSaveResult> => {
    const previousCid = await cidManager.getLastMemoryCid()
    const header = {
      agentVersion: agentOptions.agentVersion || 'unknown',
      agentName: agentOptions.agentName,
      timestamp: new Date().toISOString(),
      previousCid,
    }
    const cid = await uploadExperience(autoDriveApi, wallet, header, data, uploadOptions)
    const receipt = await cidManager.saveLastMemoryCid(cid)
    return {
      cid,
      previousCid: previousCid,
      evmHash: receipt?.hash, // Note: Receipt type might not have .hash directly
    }
  }

  /**
   * Retrieves an agent experience from AutoDrive using its CID.
   *
   * Uses retry logic to handle potential network issues during download,
   * but will not retry on 'Not Found' or signature/decryption errors.
   *
   * @param cid - The Content Identifier (CID) of the experience to retrieve.
   * @returns A Promise that resolves to the parsed AgentExperience object.
   */
  const retrieveExperience = async (cid: string) => {
    return retryWithBackoff(
      async () => {
        const experience = await downloadExperience(autoDriveApi, cid)
        return experience
      },
      {
        shouldRetry: (error: unknown) => {
          const errorMessage = error instanceof Error ? error.message : String(error)
          return !(
            errorMessage.includes('Not Found') || errorMessage.includes('incorrect header check')
          )
        },
      },
    )
  }

  return { saveExperience, retrieveExperience, cidManager }
}
