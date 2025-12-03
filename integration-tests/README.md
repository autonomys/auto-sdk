# Integration Tests

Integration tests for the Autonomys SDK packages, running against a local development blockchain.

## Quick Start

```bash
cd integration-tests

# Start the farmerless dev node (default, recommended)
yarn docker:up

# Run tests
yarn test

# Stop
yarn docker:down
```

## Test Modes

| Mode                     | Description                                   | Use Case         |
| ------------------------ | --------------------------------------------- | ---------------- |
| **Farmerless** (default) | Lightweight dev node, manual block production | CI, fast testing |
| **Full**                 | Node + farmer, automatic block production     | Full integration |
| **External**             | Connect to external RPC                       | Testnet/mainnet  |

### Farmerless Mode (Default)

Uses the [farmerless dev node](https://github.com/autonomys/subspace/pull/3725) - no farmer needed, blocks produced automatically every 100ms.

```bash
yarn docker:up
yarn test
yarn docker:down
```

### Full Mode

Uses node + farmer containers with automatic block production.

```bash
yarn docker:up:full
TEST_MODE=full yarn test
yarn docker:down:full
```

### External RPC

Connect to an existing network.

```bash
CONSENSUS_RPC_URL=ws://your-node:9944 \
DOMAIN_RPC_URL=ws://your-node:9945 \
TEST_MODE=external \
yarn test
```

## Environment Variables

| Variable            | Default                         | Description                         |
| ------------------- | ------------------------------- | ----------------------------------- |
| `TEST_MODE`         | `farmerless`                    | `farmerless`, `full`, or `external` |
| `COMPOSE_FILE`      | `docker-compose.farmerless.yml` | Docker compose file to use          |
| `CONSENSUS_RPC_URL` | `ws://127.0.0.1:9944`           | Consensus RPC endpoint              |
| `DOMAIN_RPC_URL`    | `ws://127.0.0.1:9945`           | Domain RPC endpoint                 |

## Writing Tests

```typescript
import { setupChains, cleanupChains, waitForBlocks } from '../helpers'

describe('My Test', () => {
  let apis: Awaited<ReturnType<typeof setupChains>>

  beforeAll(async () => {
    apis = await setupChains()
  }, 300000)

  afterAll(async () => {
    await cleanupChains(apis)
  })

  test('example', async () => {
    // waitForBlocks waits for blocks (blocks are produced automatically in farmerless mode)
    await waitForBlocks(apis.consensus, 2)
  })
})
```

### Available Helpers

```typescript
import {
  setupChains, // Connect to chains
  cleanupChains, // Disconnect
  waitForBlocks, // Wait for N blocks (blocks auto-produced in farmerless mode)
  waitUntil, // Wait for condition
  TEST_CONFIG, // Configuration object
} from '../helpers'
```

## CI Example

```yaml
jobs:
  integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: yarn install --frozen-lockfile
      - run: cd integration-tests && yarn docker:up
      - run: yarn test:integration
      - if: failure()
        run: cd integration-tests && yarn docker:logs
      - if: always()
        run: cd integration-tests && yarn docker:down
```

## Troubleshooting

**View logs:**

```bash
yarn docker:logs
```

**Reset everything:**

```bash
yarn docker:down && yarn docker:up
```

**Check RPC:**

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"system_health","params":[]}' \
  http://localhost:9944
```
