import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { createAutoDriveHandlers } from './handlers.js'

const AUTO_DRIVE_API_KEY =
  process.env.AUTO_DRIVE_API_KEY ??
  (() => {
    throw new Error('AUTO_DRIVE_API_KEY environment variable is not set')
  })()
const NETWORK = process.env.NETWORK === 'taurus' ? 'taurus' : 'mainnet'
const ENCRYPTION_PASSWORD = process.env.ENCRYPTION_PASSWORD

const { uploadObjectHandler, downloadObjectHandler, searchObjectsHandler } =
  createAutoDriveHandlers(AUTO_DRIVE_API_KEY, NETWORK, ENCRYPTION_PASSWORD)

export const autoDriveServer = new McpServer({ name: 'Auto Drive', version: '0.1.2' })

autoDriveServer.tool(
  'upload-object',
  'Upload an object permanently to the Autonomys Network using Auto Drive, any objects uploaded here will be permanently available onchain. This is useful for storing data that you want to keep forever.',
  {
    filename: z.string().describe('The filename to save the object as.'),
    data: z.record(z.string(), z.any()).describe(
      `
      Data you want to permanently store onchain saved as a JSON object with any key-value pairs.
      The keys are strings that describe the type of data being stored.
      The values are the actual data being stored.
      `,
    ),
  },
  async ({ filename, data }): Promise<CallToolResult> => {
    return await uploadObjectHandler({ filename, data })
  },
)

autoDriveServer.tool(
  'download-object',
  'Download a text-based object (text/*, application/json) from the Autonomys Network using Auto Drive using its Content Identifier (CID).',
  {
    cid: z.string().describe('The Content Identifier (CID) of the object to download.'),
  },
  async ({ cid }): Promise<CallToolResult> => {
    return await downloadObjectHandler({ cid })
  },
)

autoDriveServer.tool(
  'search-objects',
  'Search for objects on the Autonomys Network using Auto Drive by name or CID.',
  {
    query: z.string().describe('The name or CID fragment to search for.'),
  },
  async ({ query }): Promise<CallToolResult> => {
    return await searchObjectsHandler({ query })
  },
)
