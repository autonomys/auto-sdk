# Integration Tests

This directory contains integration tests for the Autonomys SDK packages. These tests run against a local development blockchain with consensus and domain nodes.

## Overview

Integration tests verify end-to-end functionality across multiple packages (`auto-consensus`, `auto-xdm`, `auto-dag-data`, etc.) using a real blockchain environment.

### Test Infrastructure

- **Node**: Single container running both consensus and domain operator
  - Consensus RPC: port `9944`
  - Domain RPC: port `9945` (domain 0 by default)
- **Farmer**: Separate container for farming

All services run in Docker containers using official Autonomys images.

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ and Yarn installed
- All workspace dependencies installed (`yarn install` from repo root)

### Running Tests

**From the repo root:**

```bash
# Start the blockchain infrastructure
yarn integration:up

# Wait for chains to be ready (optional, test:integration does this automatically)
yarn integration:health

# Run integration tests
yarn test:integration

# Stop the infrastructure
yarn integration:down
```

**From the integration-tests directory:**

```bash
cd integration-tests

# Start infrastructure
yarn docker:up

# Run tests
yarn test

# Stop infrastructure
yarn docker:down
```

## Available Scripts

### Root Level (run from repo root)

- `yarn integration:up` - Start Docker containers
- `yarn integration:down` - Stop and remove containers (with volumes)
- `yarn integration:logs` - View logs from all containers
- `yarn integration:restart` - Restart all containers
- `yarn integration:ps` - Show container status
- `yarn integration:health` - Check if chains are ready
- `yarn test:integration` - Run integration tests (handles setup automatically)
- `yarn test:integration:watch` - Run tests in watch mode

### Integration Tests Directory

- `yarn docker:up` - Start Docker containers
- `yarn docker:down` - Stop containers
- `yarn docker:logs` - View logs
- `yarn test` - Run tests
- `yarn test:watch` - Run tests in watch mode
- `yarn wait-for-ready` - Wait for chains to be ready

## Directory Structure

```
integration-tests/
├── docker/
│   ├── docker-compose.yml    # Docker infrastructure config
│   └── .env.example          # Environment variables template
├── helpers/
│   ├── chain.ts              # Chain setup and connection utilities
│   ├── wallets.ts            # Test wallet utilities
│   └── index.ts              # Helper exports
├── scripts/
│   └── wait-for-ready.ts     # Health check script
├── suites/                   # Test suites (organized by package)
│   ├── auto-xdm/
│   ├── auto-consensus/
│   └── cross-package/        # Tests spanning multiple packages
├── jest.config.js
├── tsconfig.json
├── package.json
└── README.md
```

## Writing Tests

### Basic Test Structure

```typescript
import { setupChains, cleanupChains } from '../helpers'

describe('My Integration Test', () => {
  let apis: Awaited<ReturnType<typeof setupChains>>

  beforeAll(async () => {
    // setupChains() automatically waits for chains to be ready
    apis = await setupChains()
  }, 300000) // Increased timeout to allow chains to start (especially on fresh Docker start)

  afterAll(async () => {
    await cleanupChains(apis)
  })

  test('should verify functionality', async () => {
    const { consensus, domain } = apis

    // Your test logic here
    const header = await consensus.rpc.chain.getHeader()
    expect(header.number.toNumber()).toBeGreaterThan(0)
  })
})
```

### Best Practices

1. **Use descriptive test names** - Make it clear what functionality is being tested
2. **Set appropriate timeouts** - Blockchain operations can take time
   - Use 120s timeout for `beforeAll` hooks that call `setupChains()` or `setupXDM()`
   - Default test timeout is 60s (configured in jest.config.js)
   - Fresh Docker starts may take longer to initialize
3. **Clean up resources** - Always disconnect APIs in `afterAll`
4. **Run tests serially** - Use `--runInBand` to avoid resource conflicts
5. **Wait for chain readiness** - `setupChains()` automatically waits for chains to be ready
6. **Organize by domain** - Group related tests in `suites/` subdirectories
7. **XDM setup** - When using `setupXDM()`, it follows the official Subspace test patterns:
   - Waits 1 block after each allowlist update
   - Conditionally waits for channel to be 'Open' before proceeding
   - Based on patterns from `subspace/domains/client/domain-operator/src/tests.rs`

### Available Helpers

```typescript
import {
  setupChains, // Connect to all chains
  cleanupChains, // Disconnect from all chains
  waitForChainReady, // Wait for a specific chain
  waitForAllChainsReady, // Wait for all chains
  setupWallets, // Create test wallets
  TEST_CONFIG, // Test configuration
} from '../helpers'
```

## Configuration

### Environment Variables

Create a `.env` file in the `docker/` directory:

```bash
NODE_VERSION=latest           # Docker image version
CONSENSUS_RPC_PORT=9944       # Consensus RPC port
DOMAIN_RPC_PORT=9945          # Domain RPC port
DOMAIN_ID=0                   # Domain ID (0 = Auto EVM)
OPERATOR_ID=0                 # Operator ID
KEYSTORE_SURI=//Bob          # Keystore URI for operator
REWARD_ADDRESS=...            # Farmer reward address
FARM_SIZE=1.1G               # Farm size
RUST_LOG=info                # Logging level
```

### Custom Endpoints

You can override RPC endpoints via environment variables:

```bash
CONSENSUS_RPC_URL=ws://localhost:9944 yarn test
DOMAIN_RPC_URL=ws://localhost:9945 yarn test
DOMAIN_ID=0 yarn test
```

## Troubleshooting

### Chains not starting

When starting Docker containers fresh, chains need time to initialize and start producing blocks. The `setupChains()` helper automatically waits for chains to be ready (producing at least 3 blocks each).

**Check logs:**

```bash
yarn integration:logs
```

**Check container status:**

```bash
yarn integration:ps
```

**Wait for chains manually:**

```bash
yarn integration:health
```

**Restart everything:**

```bash
yarn integration:restart
```

### Port conflicts

If ports 9944 or 9945 are already in use, either:

1. Stop conflicting services
2. Modify ports in `docker/.env`
3. Override with environment variables

### Tests timing out

1. Ensure `beforeAll` has sufficient timeout (300000ms recommended) when using `setupChains()` or `setupXDM()`
2. Check if chains are producing blocks: `yarn integration:logs`
3. Ensure Docker has enough resources allocated
4. On fresh Docker starts, chains may take 30-60 seconds to initialize
5. `setupChains()` automatically waits for chains to be ready, but this adds to the setup time

### Clean slate

To completely reset the environment:

```bash
yarn integration:down  # Stops and removes volumes
yarn integration:up    # Fresh start
```

### Docker image updates

To use a specific version:

```bash
NODE_VERSION=sha-abc123 yarn integration:up
```

Or update in `docker/.env`:

```bash
NODE_VERSION=latest
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Integration Tests

on: [pull_request]

jobs:
  integration:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'yarn'

      - name: Install dependencies
        run: yarn install --frozen-lockfile

      - name: Start test infrastructure
        run: yarn integration:up

      - name: Run integration tests
        run: yarn test:integration

      - name: Show logs on failure
        if: failure()
        run: yarn integration:logs

      - name: Cleanup
        if: always()
        run: yarn integration:down
```

## Adding New Test Suites

1. Create a new directory under `suites/`:

   ```bash
   mkdir -p suites/my-package
   ```

2. Add test files:

   ```bash
   touch suites/my-package/my-feature.test.ts
   ```

3. Write tests using the helper utilities

4. Tests will be automatically discovered by Jest

## Comparison with Package-Level Tests

| Type                  | Location             | Purpose              | Infrastructure  |
| --------------------- | -------------------- | -------------------- | --------------- |
| **Unit Tests**        | `packages/*/test/`   | Fast, isolated tests | Mocked APIs     |
| **Integration Tests** | `integration-tests/` | End-to-end workflows | Real blockchain |

- Use **unit tests** for fast feedback during development
- Use **integration tests** for validating real-world scenarios

## Performance Tips

1. **Cache Docker images** in CI for faster startup
2. **Run tests serially** (`--runInBand`) to avoid resource conflicts
3. **Use health checks** to ensure chains are ready before testing
4. **Limit test scope** to what requires a real chain
5. **Keep infrastructure running** during development (don't restart for each test run)

## Support

For questions or issues:

- Check the [Troubleshooting](#troubleshooting) section
- Review logs: `yarn integration:logs`
- Open an issue in the repo

## Contributing

When adding new integration tests:

1. Follow existing test patterns
2. Add descriptive test names
3. Include cleanup in `afterAll`
4. Document any special setup requirements
5. Test locally before submitting PR
