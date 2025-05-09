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

// Register save-experience tool with a simpler, more permissive schema
autoExperiencesServer.tool(
  'save-experience',
  'Saves the provided agent experience data. Uploads to AutoDrive and updates the last experience CID.',
  {
    // Using a simpler schema that's more compatible across clients
    data: z
      .object({})
      .passthrough()
      .optional()
      .describe(
        'The experience data to save. Can be any JSON object with fields like title, description, etc.',
      ),
  },
  async (args) => {
    try {
      console.error('save-experience received args:', JSON.stringify(args))

      // If data is missing entirely, use empty object
      const inputData = args?.data || {}

      console.error('Processed data for save:', JSON.stringify(inputData))

      return await saveExperienceHandler({ data: inputData })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
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
