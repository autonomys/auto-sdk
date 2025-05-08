#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
// Import directly from the root index file
import { autoExperiencesServer } from '../auto-experiences/index.js'

// Main function with improved error handling and process management
const main = async () => {
  try {
    console.error('Starting Auto Experiences MCP server...')

    // Create transport
    const transport = new StdioServerTransport()

    // Connect to transport (this initiates message handling)
    await autoExperiencesServer.connect(transport)
    console.error('Auto Experiences server running and ready to accept requests')
  } catch (error) {
    console.error('Failed to start Auto Experiences server:', error)
    process.exit(1)
  }
}

// Execute main function with global error handling
main().catch((error) => {
  console.error('Unhandled error in main():', error)
  process.exit(1)
})
