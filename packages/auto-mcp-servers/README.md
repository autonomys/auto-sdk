# Autonomys MCP Servers

This package provides Model Context Protocol (MCP) servers for Autonomys services. These servers expose Autonomys SDK functionality as MCP tools that can be used with Claude Desktop and other MCP clients, or integrated into agent frameworks.

## Available Servers

### Auto Drive Server

The Auto Drive server exposes functionality from the `@autonomys/auto-drive` package as MCP tools.

#### Tools

The Auto Drive server provides the following tools:

- `uploadObject`: Upload an object to the Autonomys network.

More servers and tools will be coming soon!

## Usage

### With Claude Desktop

1. Install Claude Desktop
2. Install the Auto Drive server globally:

```bash
npm install -g @autonomys/auto-mcp-servers
# or
yarn global add @autonomys/auto-mcp-servers
```

3. Edit your `claude_desktop_config.json` file:

```json
{
  "mcpServers": {
    "auto-drive": {
      "command": "npx",
      "args": ["auto-drive-server"],
      "env": { "AUTO_DRIVE_API_KEY": "your-api-key" }
    }
  }
}
```

4. Restart Claude Desktop

### In Agent Frameworks

You can use these MCP servers as tools with agent frameworks such as LangChain.

1. Install the Auto Drive server into your project:

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

## License

MIT
