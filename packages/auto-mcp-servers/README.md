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

### Auto Consensus Server

The Auto Consensus server exposes functionality from the `@autonomys/auto-consensus` package as MCP tools for interacting with the Autonomys consensus chain.

#### Tools

The Auto Consensus server provides the following tools:

**Account Management:**

- `get-account-info`: Retrieve detailed account information including nonce and balance data.
- `get-balance`: Get account balance with formatted amounts.
- `get-total-issuance`: Get total token issuance in the network.

**Chain Information:**

- `get-block-info`: Get current block number, hash, and timestamp.
- `get-network-timestamp`: Get current network timestamp.
- `get-space-pledged`: Get total space pledged in the network.

**Staking Operations:**

- `get-operator-info`: Get detailed operator information.
- `get-operators`: List all operators.

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
    },
    "auto-consensus": {
      "command": "npx",
      "args": ["-y", "@autonomys/auto-mcp-servers", "auto-consensus"],
      "env": {
        "NETWORK_ID": "mainnet or taurus or localhost (optional, defaults to mainnet)",
        "RPC_ENDPOINT": "custom-rpc-endpoint (optional)"
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

4. Use the Auto Consensus server:

```typescript
// Create Auto Consensus tools
const createAutoConsensusTools = async (
  networkId: string = 'mainnet',
): Promise<StructuredToolInterface[]> => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['node_modules/.bin/auto-consensus-server'],
    env: {
      NETWORK_ID: networkId,
    },
  })

  const client = new Client({ name: 'auto-consensus', version: '0.1.0' })
  client.connect(transport)

  return await loadMcpTools('auto-consensus', client)
}

// Use the tools
const consensusTools = await createAutoConsensusTools('mainnet')

// Example: Get account balance
const balanceResult = await model
  .bindTools(consensusTools)
  .invoke('Get the balance of account 5GmS1wtCfR4tK5SSgnZbVT4kYw5W8NmxmijcsxCQE6oLW6A8')
console.log(balanceResult)
```

## License

MIT
