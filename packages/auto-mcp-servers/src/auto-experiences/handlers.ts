import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
// Use ExperienceManager for saving/retrieving full experiences
import { createExperienceManager } from '@autonomys/auto-agents'
import {
  AgentExperience,
  AgentExperienceV0,
  ExperienceManagerOptions,
  ExperienceSaveResult,
} from '@autonomys/auto-agents/dist/experiences/types.js'

export const createExperienceHandlers = async (options: ExperienceManagerOptions) => {
  // Initialize ExperienceManager - this handles CidManager and AutoDrive interactions internally
  const experienceManager = await createExperienceManager(options)

  return {
    /**
     * Saves the provided agent experience data.
     * Uploads data to AutoDrive and updates the last experience CID.
     * @param data - The experience data (JSON object).
     */
    saveExperienceHandler: async ({
      data,
    }: {
      data: Record<string, unknown> | unknown[] // Allow object or array data
    }): Promise<CallToolResult> => {
      try {
        // saveExperience handles header creation, upload, and saving the latest CID
        const result: ExperienceSaveResult = await experienceManager.saveExperience(data)
        const responseText = `Experience saved successfully. CID: ${result.cid}${result.previousCid ? `, Previous CID: ${result.previousCid}` : ''}${result.evmHash ? `, EVM Tx: ${result.evmHash}` : ', EVM save skipped/failed.'}`
        return { content: [{ type: 'text', text: responseText }] }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        console.error('Failed to save experience:', error)
        return {
          isError: true,
          content: [{ type: 'text', text: `Error saving experience: ${error.message}` }],
        }
      }
    },

    /**
     * Retrieves an agent experience from AutoDrive using its CID.
     * @param cid - The CID of the experience to retrieve.
     */
    retrieveExperienceHandler: async ({ cid }: { cid: string }): Promise<CallToolResult> => {
      try {
        // retrieveExperience handles download and potential retries
        const experience: AgentExperience | AgentExperienceV0 =
          await experienceManager.retrieveExperience(cid)
        // Return the full experience object (header + data or V0 structure) as JSON string
        return { content: [{ type: 'text', text: JSON.stringify(experience, null, 2) }] }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        console.error(`Failed to retrieve experience for CID ${cid}:`, error)
        // Provide more specific error if possible (e.g., Not Found)
        const errorMessage = error.message?.includes('Not Found')
          ? `Experience not found for CID: ${cid}`
          : `Error retrieving experience: ${error.message}`
        return {
          isError: true,
          content: [{ type: 'text', text: errorMessage }],
        }
      }
    },
  }
}
