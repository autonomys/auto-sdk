# Autonomys MCP Servers

This package provides Model Context Protocol (MCP) servers for Autonomys services. These servers expose Autonomys SDK functionality as MCP tools that can be used with Claude Desktop and other MCP clients, or integrated into agent frameworks.

## Available Servers

### Auto Drive Server

The Auto Drive server exposes functionality from the `@autonomys/auto-drive` package as MCP tools.

#### Tools

The Auto Drive server provides the following tools:

- `upload-object`: Upload an object (as JSON data) to the Autonomys network.
- `download-object`: Download a text-based object (`text/*` or `application/json`) from the Autonomys network using its CID.
- `search-objects`: Search for objects on the Autonomys network by name or CID fragment. Returns a JSON object containing an array of results, each including the object's name, CID, type, size, and mimeType (for files).

### Auto Experiences Server

The Auto Experiences server exposes functionality from the `@autonomys/auto-agents` package as MCP tools, specifically for managing agent experiences.

#### Tools

The Auto Experiences server provides the following tools:

- `save-experience`: Saves agent experience data to the Autonomys network, uploads the data to AutoDrive, and updates the last experience CID. Returns the new CID, previous CID (if any), and EVM transaction hash (if available).
- `retrieve-experience`: Retrieves an agent experience from the Autonomys network using its CID. Returns the full experience object including headers and data.

More servers and tools will be coming soon!

## Usage

### With Claude Desktop

1. Install Claude Desktop
2. Edit your `claude_desktop_config.json` file:

```json
{
  "mcpServers": {
    "auto-drive": {
      "command": "npx",
      "args": ["-y", "@autonomys/auto-mcp-servers", "auto-drive"],
      "env": {
        "AUTO_DRIVE_API_KEY": "your-api-key",
        "ENCRYPTION_PASSWORD": "my-password (optional)",
        "NETWORK": "mainnet or taurus (optional, defaults to mainnet)"
      }
    },
    "auto-experiences": {
      "command": "npx",
      "args": ["-y", "@autonomys/auto-mcp-servers", "auto-experiences"],
      "env": {
        "AUTO_DRIVE_API_KEY": "your-api-key",
        "AGENT_PATH": "your-agent-path",
        "AGENT_NAME": "your-agent-name",
        "PRIVATE_KEY": "your-wallet-private-key",
        "NETWORK": "mainnet or taurus (optional, defaults to mainnet)",
        "UPLOAD_ENCRYPTION_PASSWORD": "my-password (optional)",
        "AGENT_VERSION": "your-agent-version (optional)",
        "RPC_URL": "your-evm-rpc-url (optional)",
        "CONTRACT_ADDRESS": "your-contract-address (optional)"
      }
    }
  }
}
```

4. Restart Claude Desktop

### In Agent Frameworks

You can use these MCP servers as tools with agent frameworks such as LangChain.

1. Install the Auto MCP servers into your project:

```bash
npm install @autonomys/auto-mcp-servers
# or
yarn add @autonomys/auto-mcp-servers
```

2. Use the Auto Drive server as a tool in your agent project:

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import {
  StdioClientTransport,
  StdioServerParameters,
} from '@modelcontextprotocol/sdk/client/stdio.js'
import { loadMcpTools } from '@langchain/mcp-adapters'
import { StructuredToolInterface } from '@langchain/core/tools'
import { ChatOpenAI } from '@langchain/openai'

// Create Auto Drive tools with a single function
const createAutoDriveTools = async (apiKey: string): Promise<StructuredToolInterface[]> => {
  // Set up transport for Auto Drive server
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['node_modules/.bin/auto-drive-server'],
    env: { AUTO_DRIVE_API_KEY: apiKey },
  })

  // Initialize client and connect
  const client = new Client({ name: 'auto-drive', version: '0.0.1' })
  client.connect(transport)

  // Load MCP tools
  return await loadMcpTools('auto-drive', client)
}

// Create tools with your API key
const tools = await createAutoDriveTools('your-api-key')

// Initialize the ChatOpenAI model
const model = new ChatOpenAI({ modelName: 'gpt-4o' })

const result = await model
  .bindTools(tools)
  .invoke('Upload a profound thought to the Autonomys network')
console.log(result)
```

3. Use the Auto Experiences server in a similar way:

```typescript
// Create Auto Experiences tools
const createAutoExperiencesTools = async (config: {
  apiKey: string
  agentPath: string
  agentName: string
  privateKey: string
}): Promise<StructuredToolInterface[]> => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['node_modules/.bin/auto-experiences-server'],
    env: {
      AUTO_DRIVE_API_KEY: config.apiKey,
      AGENT_PATH: config.agentPath,
      AGENT_NAME: config.agentName,
      PRIVATE_KEY: config.privateKey,
    },
  })

  const client = new Client({ name: 'auto-experiences', version: '0.0.1' })
  client.connect(transport)

  return await loadMcpTools('auto-experiences', client)
}
```

## License

MIT
