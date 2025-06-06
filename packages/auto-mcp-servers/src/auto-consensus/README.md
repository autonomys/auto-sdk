# Auto Consensus MCP Server

The Auto Consensus MCP server provides tools for interacting with the Autonomys consensus chain through the Model Context Protocol (MCP). It exposes functionality from the `@autonomys/auto-consensus` package as MCP tools.

## Features

### Account Management

- **get-account-info**: Retrieve detailed account information including nonce and balance data
- **get-balance**: Get account balance (simplified view with formatted amounts)
- **get-total-issuance**: Get total token issuance in the network

### Chain Information

- **get-block-info**: Get current block number, hash, and timestamp
- **get-network-timestamp**: Get current network timestamp
- **get-space-pledged**: Get total space pledged in the network

### Staking Operations (Read-only - Phase 1)

- **get-operator-info**: Get detailed operator information
- **get-operators**: List all operators

## Configuration

### Environment Variables

- `RPC_ENDPOINT`: Custom RPC endpoint (optional) - only needed if you want to use a non-standard RPC endpoint

### Network Selection

Each tool accepts an optional `networkId` parameter to specify which network to query:

- `mainnet` (default): Main Autonomys network
- `taurus`: Testnet network
- `localhost`: Local development network

If not specified, tools will default to mainnet.

## Usage with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "auto-consensus": {
      "command": "npx",
      "args": ["-y", "@autonomys/auto-mcp-servers", "auto-consensus"]
    }
  }
}
```

## Usage in Agent Frameworks

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { loadMcpTools } from '@langchain/mcp-adapters'

const createAutoConsensusTools = async (networkId: string = 'mainnet') => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['node_modules/.bin/auto-consensus-server'],
    env: { NETWORK_ID: networkId },
  })

  const client = new Client({ name: 'auto-consensus', version: '0.1.0' })
  client.connect(transport)

  return await loadMcpTools('auto-consensus', client)
}

// Use the tools
const tools = await createAutoConsensusTools('mainnet')
```

## Examples

### Get Account Balance

```
Tool: get-balance
Parameters: {
  "address": "5GmS1wtCfR4tK5SSgnZbVT4kYw5W8NmxmijcsxCQE6oLW6A8"
}
```

### Get Current Block Info

```
Tool: get-block-info
Parameters: {}
```

### Get Operator Information

```
Tool: get-operator-info
Parameters: {
  "operatorId": "1"
}
```

### List All Domains

```
Tool: get-domains
Parameters: {}
```

## Future Enhancements

The following features are planned for future releases:

### Staking Write Operations

- Register operator
- Nominate operator
- Withdraw stake
- Unlock funds

### Advanced Staking Calculations

- Get staking position (implementing logic from staking.md)
- Calculate instant share price
- Get withdrawal information

### Transaction Management

- Transfer tokens
- Batch transactions

### Enhanced Monitoring

- Real-time event subscriptions
- Historical data queries
