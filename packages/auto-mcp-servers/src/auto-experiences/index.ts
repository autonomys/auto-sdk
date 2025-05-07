import { ExperienceManagerOptions } from '@autonomys/auto-agents'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { createExperienceHandlers } from './handlers'

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

// --- Initialize Handlers ---
let experienceHandlers: Awaited<ReturnType<typeof createExperienceHandlers>>

const initializeHandlers = async () => {
  experienceHandlers = await createExperienceHandlers(experienceManagerOptions)
}

// --- Create MCP Server ---
export const autoExperiencesServer = new McpServer({ name: 'Auto Experiences', version: '0.2.0' })

// --- Define and Register Tools ---
initializeHandlers()
  .then(() => {
    console.log('Auto Experiences Handlers Initialized.')

    // Register save-experience tool
    autoExperiencesServer.tool(
      'save-experience', // name: string
      'Saves the provided agent experience data. Uploads to AutoDrive and updates the last experience CID.', // description: string
      {
        // paramsSchema: ZodRawShape
        data: z
          .union([z.record(z.string(), z.any()), z.array(z.any())])
          .describe('The agent experience data to save (JSON object or array).'),
      },

      async (args: { data: Record<string, unknown> | unknown[] }): Promise<CallToolResult> => {
        if (!experienceHandlers) throw new Error('Handlers not initialized')
        // Access data via args.data
        return await experienceHandlers.saveExperienceHandler({ data: args.data })
      },
    )

    // Register retrieve-experience tool
    autoExperiencesServer.tool(
      'retrieve-experience', // name: string
      'Retrieves an agent experience from AutoDrive using its CID.', // description: string
      {
        // paramsSchema: ZodRawShape
        cid: z
          .string()
          .describe('The Content Identifier (CID) string of the experience to retrieve.'),
      },
      // cb: (args, extra) => Promise<CallToolResult>
      async (args: { cid: string }): Promise<CallToolResult> => {
        if (!experienceHandlers) throw new Error('Handlers not initialized')
        // Access cid via args.cid
        return await experienceHandlers.retrieveExperienceHandler({ cid: args.cid })
      },
    )

    console.log('Auto Experiences MCP tools registered.')
  })
  .catch((error) => {
    console.error('Failed to initialize Auto Experiences handlers:', error)
    process.exit(1)
  })
