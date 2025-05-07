import { ExperienceManagerOptions } from '@autonomys/auto-agents'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { createExperienceHandlers } from './handlers.js'

// AutoDrive Config
const AUTO_DRIVE_API_KEY =
  process.env.AUTO_DRIVE_API_KEY ??
  (() => {
    throw new Error('AUTO_DRIVE_API_KEY env var missing')
  })()
const NETWORK = process.env.NETWORK === 'taurus' ? 'taurus' : 'mainnet'
const UPLOAD_ENCRYPTION_PASSWORD = process.env.UPLOAD_ENCRYPTION_PASSWORD

// Agent Config
const AGENT_PATH =
  process.env.AGENT_PATH ??
  (() => {
    throw new Error('AGENT_PATH env var missing')
  })()
const AGENT_NAME =
  process.env.AGENT_NAME ??
  (() => {
    throw new Error('AGENT_NAME env var missing')
  })()
const AGENT_VERSION = process.env.AGENT_VERSION // Optional

// Wallet / EVM Config
const RPC_URL = process.env.RPC_URL
const PRIVATE_KEY = process.env.PRIVATE_KEY
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS

// Construct ExperienceManagerOptions
const experienceManagerOptions: ExperienceManagerOptions = {
  autoDriveApiOptions: {
    apiKey: AUTO_DRIVE_API_KEY,
    network: NETWORK,
  },
  agentOptions: {
    agentPath: AGENT_PATH,
    agentName: AGENT_NAME,
    ...(AGENT_VERSION && { agentVersion: AGENT_VERSION }),
  },
  // Wallet options are required by ExperienceManager for signing uploads, even if EVM isn't used for CID storage
  walletOptions: {
    ...(RPC_URL && CONTRACT_ADDRESS
      ? {
          contractInfo: {
            rpcUrl: RPC_URL,
            contractAddress: CONTRACT_ADDRESS,
          },
        }
      : {}),
    privateKey:
      PRIVATE_KEY ??
      (() => {
        throw new Error('PRIVATE_KEY env var missing')
      })(),
  },
  // Ensure uploadOptions is always present and includes required fields
  uploadOptions: {
    ...(UPLOAD_ENCRYPTION_PASSWORD && { password: UPLOAD_ENCRYPTION_PASSWORD }),
    compression: true,
  },
}

// Check if EVM details are partially missing for CID storage, Wallet is still needed for signing
if (!RPC_URL || !CONTRACT_ADDRESS) {
  console.error(
    'EVM environment variables (RPC_URL, CONTRACT_ADDRESS) not fully set. Experience manager will operate in offline mode with local-only CID storage. Wallet private key IS still required for signing uploads.',
  )
}

// Create MCP Server
export const autoExperiencesServer = new McpServer({ name: 'Auto Experiences', version: '0.1.0' })

// Initialize handlers - now fully synchronous with internal async management
console.error('Initializing Auto Experiences Handlers...')
const { saveExperienceHandler, retrieveExperienceHandler } =
  createExperienceHandlers(experienceManagerOptions)

// Define a schema that accepts different formats
const dataSchema = z
  .union([
    z.record(z.string(), z.any()),
    z.array(z.any()),
    z.string().transform((str) => {
      try {
        return JSON.parse(str)
      } catch (error) {
        // Log the parsing error and re-throw as a Zod error
        console.error('Failed to parse JSON string:', error)
        throw new Error(
          'Failed to parse data string as JSON. Please provide valid JSON string, object, or array.',
        )
      }
    }),
  ])
  .describe(
    'The agent experience data to save (JSON object, array, or string containing valid JSON)',
  )

// Register save-experience tool
autoExperiencesServer.tool(
  'save-experience',
  'Saves the provided agent experience data. Uploads to AutoDrive and updates the last experience CID.',
  {
    data: dataSchema,
  },
  async (args: { data?: unknown }) => {
    try {
      // Make sure data exists
      if (!args.data) {
        return {
          isError: true,
          content: [{ type: 'text', text: 'Error: Missing required data parameter' }],
        }
      }

      // Handle string input
      let processedData: Record<string, unknown> | unknown[]
      if (typeof args.data === 'string') {
        try {
          processedData = JSON.parse(args.data)
        } catch (error) {
          return {
            isError: true,
            content: [
              { type: 'text', text: `Error parsing JSON string: ${(error as Error).message}` },
            ],
          }
        }
      } else {
        processedData = args.data as Record<string, unknown> | unknown[]
      }

      return await saveExperienceHandler({ data: processedData })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Error in save-experience tool:', errorMessage)
      return {
        isError: true,
        content: [{ type: 'text', text: `Error processing save request: ${errorMessage}` }],
      }
    }
  },
)

// Register retrieve-experience tool
autoExperiencesServer.tool(
  'retrieve-experience',
  'Retrieves an agent experience from AutoDrive using its CID.',
  {
    cid: z.string().describe('The Content Identifier (CID) string of the experience to retrieve.'),
  },
  async (args: { cid?: string }) => {
    if (!args.cid) {
      return {
        isError: true,
        content: [{ type: 'text', text: 'Error: Missing required cid parameter' }],
      }
    }

    return await retrieveExperienceHandler({ cid: args.cid })
  },
)

console.error('Auto Experiences MCP tools registered.')
