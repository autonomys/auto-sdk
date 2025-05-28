#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

const showHelp = () => {
  console.error(`
Usage: auto-mcp-servers [server-name]

Available servers:
  auto-drive       Start the Auto Drive MCP server
  auto-experiences Start the Auto Experiences MCP server

Environment variables:
  For Auto Drive server:
    AUTO_DRIVE_API_KEY     API key for Auto Drive (required)
    NETWORK                'mainnet' (default) or 'taurus'
    ENCRYPTION_PASSWORD    Password for encryption (optional)

  For Auto Experiences server:
    AUTO_DRIVE_API_KEY     API key for Auto Drive (required)
    NETWORK                'mainnet' (default) or 'taurus'
    UPLOAD_ENCRYPTION_PASSWORD  Password for encryption (optional)
    AGENT_PATH             Path to agent (required)
    AGENT_NAME             Name of agent (required)
    AGENT_VERSION          Version of agent (optional)
    PRIVATE_KEY            Wallet private key (required)
    RPC_URL                EVM RPC URL (optional)
    CONTRACT_ADDRESS       Contract address (optional)
  `)
  process.exit(1)
}

const main = async () => {
  const serverName = process.argv[2] || 'auto-drive'
  const transport = new StdioServerTransport()

  try {
    switch (serverName) {
      case 'auto-drive': {
        console.error('Starting Auto Drive MCP server...')
        const { autoDriveServer } = await import('../auto-drive/index.js')
        await autoDriveServer.connect(transport)
        break
      }
      case 'auto-experiences': {
        console.error('Starting Auto Experiences MCP server...')
        const { autoExperiencesServer } = await import('../auto-experiences/index.js')
        await autoExperiencesServer.connect(transport)
        break
      }
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
  } catch (error) {
    console.error(`Failed to start ${serverName} server:`, error)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Failed to start MCP server:', error)
  process.exit(1)
})
