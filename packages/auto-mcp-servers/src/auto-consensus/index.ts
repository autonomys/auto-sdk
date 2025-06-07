import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { createConsensusHandlers } from './handlers/index.js'

// Create handlers
const handlers = createConsensusHandlers()

// Network ID
const networkId = z
  .optional(z.enum(['mainnet', 'taurus', 'localhost']))
  .describe('Default to mainnet unless explicitly specified otherwise.')

// Create MCP Server
export const autoConsensusServer = new McpServer({
  name: 'Auto Consensus',
  version: '0.1.0',
  description:
    'A server for interacting with the Autonomys Network consensus chain. All tools default to returning data for the mainnet. If the testnet work is desired the user will specify either Taurus or localhost in their request.',
})

// Account Management Tools
autoConsensusServer.tool(
  'get-account-info',
  'Retrieve detailed account information including nonce and balance data for an account on the Autonomys Network consensus chain',
  {
    address: z.string().describe('The account address'),
    networkId,
  },
  async ({ address, networkId }): Promise<CallToolResult> => {
    return await handlers.getAccountInfoHandler({ address, networkId })
  },
)

autoConsensusServer.tool(
  'get-balance',
  'Get account balance (simplified view)',
  {
    address: z.string().describe('The account address'),
    networkId,
  },
  async ({ address, networkId }): Promise<CallToolResult> => {
    return await handlers.getBalanceHandler({ address, networkId })
  },
)

autoConsensusServer.tool(
  'get-total-issuance',
  'Get total token issuance in the network',
  {
    networkId,
  },
  async ({ networkId }): Promise<CallToolResult> => {
    return await handlers.getTotalIssuanceHandler({ networkId })
  },
)

// Chain Information Tools
autoConsensusServer.tool(
  'get-block-info',
  'Get current block number, and hash',
  {
    networkId,
    blockNumber: z
      .number()
      .optional()
      .describe('Specific block number to query. If not provided, returns current block'),
  },
  async ({ networkId, blockNumber }): Promise<CallToolResult> => {
    return await handlers.getBlockInfoHandler({ networkId, blockNumber })
  },
)

autoConsensusServer.tool(
  'get-space-pledged',
  'Get total space pledged in the network',
  {
    networkId: z.string().optional().describe('Network ID (mainnet/taurus/localhost)'),
  },
  async ({ networkId }): Promise<CallToolResult> => {
    return await handlers.getSpacePledgedHandler({ networkId })
  },
)

autoConsensusServer.tool(
  'get-blockchain-size',
  'Get total blockchain history size',
  {
    networkId: z.string().optional().describe('Network ID (mainnet, taurus, localhost)'),
  },
  async ({ networkId }): Promise<CallToolResult> => {
    return await handlers.getBlockchainSizeHandler({ networkId })
  },
)

// Basic Staking Tools (Phase 1 - Read operations)
autoConsensusServer.tool(
  'get-operator-info',
  'Get detailed operator information',
  {
    operatorId: z.string().describe('The operator ID'),
    networkId,
  },
  async ({ operatorId, networkId }): Promise<CallToolResult> => {
    return await handlers.getOperatorInfoHandler({ operatorId, networkId })
  },
)

autoConsensusServer.tool(
  'get-operators',
  'List all operators',
  {
    networkId,
  },
  async ({ networkId }): Promise<CallToolResult> => {
    return await handlers.getOperatorsHandler({ networkId })
  },
)

console.error('Auto Consensus MCP server initialized')
