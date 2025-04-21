import { createAutoDriveApi, UploadFileOptions } from '@autonomys/auto-drive'

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const createAutoDriveHandlers = (
  apiKey: string,
  network: 'taurus' | 'mainnet',
  encryptionPassword?: string,
) => {
  const autoDriveApi = createAutoDriveApi({ apiKey, network })
  const uploadOptions: UploadFileOptions | undefined = encryptionPassword
    ? { password: encryptionPassword }
    : undefined

  return {
    uploadObjectHandler: async ({
      filename,
      data,
    }: {
      filename: string
      data: Record<string, any>
    }): Promise<CallToolResult> => {
      const cid = await autoDriveApi.uploadObjectAsJSON({ data }, filename, uploadOptions)
      return { content: [{ type: 'text', text: `Object uploaded successfully with ${cid}` }] }
    },
    downloadObjectHandler: async ({ cid }: { cid: string }): Promise<CallToolResult> => {
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
          const stream = await autoDriveApi.downloadFile(cid, encryptionPassword)
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
    searchObjectsHandler: async ({ query }: { query: string }): Promise<CallToolResult> => {
      const summaries = await autoDriveApi.searchByNameOrCID(query)
      return {
        content: [
          { type: 'text', text: `Objects found: ${summaries.map((s) => s.name).join(', ')}` },
        ],
      }
    },
  }
}
