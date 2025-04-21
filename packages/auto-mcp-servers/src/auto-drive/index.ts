import { createAutoDriveApi, UploadFileOptions } from '@autonomys/auto-drive'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import * as mcp_types from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'

const AUTO_DRIVE_API_KEY = process.env.AUTO_DRIVE_API_KEY
const NETWORK = process.env.NETWORK === 'taurus' ? 'taurus' : 'mainnet'
const ENCRYPTION_PASSWORD = process.env.ENCRYPTION_PASSWORD
const uploadOptions: UploadFileOptions | undefined = ENCRYPTION_PASSWORD
  ? { password: ENCRYPTION_PASSWORD }
  : undefined

const autoDriveApi = createAutoDriveApi({ network: NETWORK, apiKey: AUTO_DRIVE_API_KEY })

export const autoDriveServer = new McpServer({ name: 'Auto Drive', version: '0.1.1' })

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

autoDriveServer.tool(
  'download-object',
  'Download a text-based object (text/*, application/json) from Auto Drive using its Content Identifier (CID).',
  {
    cid: z.string().describe('The Content Identifier (CID) of the object to download.'),
  } as any,
  async (
    { cid },
    _extra,
    // extra: RequestHandlerExtra, // Infer extra type
  ): Promise<{ content: mcp_types.TextContent[]; isError?: boolean }> => {
    if (!AUTO_DRIVE_API_KEY) {
      throw new Error('AUTO_DRIVE_API_KEY environment variable is not set')
    }
    try {
      // Get object summary to determine type and metadata
      const summaries = await autoDriveApi.searchByNameOrCID(cid)
      if (!summaries || summaries.length === 0) {
        throw new Error(`Object not found for CID: ${cid}`)
      }
      const summary = summaries[0]

      // Handle folders
      if (summary.type === 'folder') {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error: CID ${cid} points to a folder, which cannot be downloaded directly with this tool.`,
            },
          ],
        }
      }

      const mimeType = summary.mimeType || 'application/octet-stream'
      const filename = summary.name || `download-${cid}`

      // Handle only text-based types
      if (mimeType.startsWith('text/') || mimeType === 'application/json') {
        const stream = await autoDriveApi.downloadFile(cid, ENCRYPTION_PASSWORD)
        let fileBuffer = Buffer.alloc(0)
        for await (const chunk of stream) {
          fileBuffer = Buffer.concat([fileBuffer, chunk])
        }
        try {
          const text = fileBuffer.toString('utf-8')
          return {
            content: [{ type: 'text', text }],
          }
        } catch (e) {
          console.error(`Failed to decode text content for ${filename} (${mimeType})`, e)
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Error: Failed to decode file content for ${filename} as UTF-8 text.`,
              },
            ],
          }
        }
      }

      // For all other types, return an error
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Error: File type \'${mimeType}\' is not supported for direct download in this client. Only text/* and application/json are supported.`,
          },
        ],
      }
    } catch (error: any) {
      console.error(`Failed to download object with CID ${cid}:`, error)
      const errorMessage = error.message || 'Unknown error occurred during download.'
      return {
        isError: true,
        content: [{ type: 'text', text: `Error downloading object: ${errorMessage}` }],
      }
    }
  },
)
