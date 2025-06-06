#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { autoConsensusServer } from '../auto-consensus/index.js'

const main = async () => {
  try {
    console.error('Starting Auto Consensus MCP server...')

    // Create transport
    const transport = new StdioServerTransport()

    // Connect to transport
    await autoConsensusServer.connect(transport)
    console.error('Auto Consensus server running and ready to accept requests')
  } catch (error) {
    console.error('Failed to start Auto Consensus server:', error)
    process.exit(1)
  }
}

// Execute main function with global error handling
main().catch((error) => {
  console.error('Unhandled error in main():', error)
  process.exit(1)
})
