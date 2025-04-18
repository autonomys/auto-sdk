#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { autoDriveServer } from '../auto-drive/index.js'

const showHelp = () => {
  console.log(`
Usage: auto-mcp-servers [server-name]

Available servers:
  auto-drive    Start the Auto Drive MCP server

Environment variables:
  For Auto Drive server:
    AUTO_DRIVE_API_KEY     API key for Auto Drive (required)
    NETWORK                'mainnet' (default) or 'taurus'
    ENCRYPTION_PASSWORD    Password for encryption (optional)
  `)
  process.exit(1)
}

const main = async () => {
  const serverName = process.argv[2] || 'auto-drive'
  const transport = new StdioServerTransport()

  switch (serverName) {
    case 'auto-drive':
      await autoDriveServer.connect(transport)
      break
    case 'help':
    case '--help':
    case '-h':
      showHelp()
      break
    default:
      console.error(`Unknown server: ${serverName}`)
      showHelp()
      break
  }
}

main().catch((error) => {
  console.error(`Failed to start MCP server:`, error)
  process.exit(1)
})
