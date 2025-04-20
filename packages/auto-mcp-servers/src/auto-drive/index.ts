import { createAutoDriveApi, UploadFileOptions } from '@autonomys/auto-drive'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

const AUTO_DRIVE_API_KEY = process.env.AUTO_DRIVE_API_KEY
const NETWORK = process.env.NETWORK === 'taurus' ? 'taurus' : 'mainnet'
const ENCRYPTION_PASSWORD = process.env.ENCRYPTION_PASSWORD
const uploadOptions: UploadFileOptions | undefined = ENCRYPTION_PASSWORD
  ? { password: ENCRYPTION_PASSWORD }
  : undefined

const autoDriveApi = createAutoDriveApi({ network: NETWORK, apiKey: AUTO_DRIVE_API_KEY })

export const autoDriveServer = new McpServer({ name: 'Auto Drive', version: '0.1.0' })

autoDriveServer.tool(
  'upload-object',
  'Upload an object permanently to Auto Drive, any objects uploaded here will be permanently available onchain. This is useful for storing data that you want to keep forever.',
  {
    filename: z.string().describe('The filename to save the object as.'),
    data: z.record(z.string(), z.any()).describe(
      `
      Data you want to permanently store onchain saved as a JSON object with any key-value pairs.
      The keys are strings that describe the type of data being stored.
      The values are the actual data being stored.
      `,
    ),
  } as any,
  async ({ filename, data }, extra) => {
    if (!AUTO_DRIVE_API_KEY) {
      throw new Error('AUTO_DRIVE_API_KEY environment variable is not set')
    }
    const cid = await autoDriveApi.uploadObjectAsJSON({ data }, filename, uploadOptions)
    return { content: [{ type: 'text', text: `Object uploaded successfully with ${cid}` }] }
  },
)
