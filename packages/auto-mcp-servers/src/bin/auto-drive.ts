#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { autoDriveServer } from '../index.js'

const main = async () => {
  const transport = new StdioServerTransport()
  await autoDriveServer.connect(transport)
}

main().catch((error) => {
  console.error('Failed to start Auto Drive server:', error)
  process.exit(1)
})
