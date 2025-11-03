import { createConnection, type ApiPromise } from '@autonomys/auto-utils'

/**
 * Configuration for integration test environment
 */
export const TEST_CONFIG = {
  isLocalhost: true,
  network: { networkId: 'localhost' as const },
  endpoints: {
    consensus: process.env.CONSENSUS_RPC_URL || 'ws://127.0.0.1:9944',
    domain: process.env.DOMAIN_RPC_URL || 'ws://127.0.0.1:9945',
  },
  domainId: process.env.DOMAIN_ID || '0',
}

/**
 * Sleep helper for waiting
 */
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Wait for a chain to be ready by checking if it's producing blocks
 */
export const waitForChainReady = async (
  endpoint: string,
  minBlocks = 3,
  maxAttempts = 30,
): Promise<void> => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const api = await createConnection(endpoint)
      const header = await api.rpc.chain.getHeader()
      const blockNumber = header.number.toNumber()

      if (blockNumber >= minBlocks) {
        await api.disconnect()
        return
      }

      await api.disconnect()
    } catch {
      // Chain not ready yet, continue waiting
    }
    await sleep(2000)
  }

  throw new Error(`Chain at ${endpoint} not ready after ${maxAttempts} attempts`)
}

/**
 * Wait for all chains to be ready
 */
export const waitForAllChainsReady = async (): Promise<void> => {
  console.log('Waiting for consensus chain...')
  await waitForChainReady(TEST_CONFIG.endpoints.consensus)

  console.log(`Waiting for domain ${TEST_CONFIG.domainId}...`)
  await waitForChainReady(TEST_CONFIG.endpoints.domain)

  console.log('All chains ready!')
}

/**
 * Setup chains for testing
 */
export const setupChains = async () => {
  const api = await createConnection(TEST_CONFIG.endpoints.consensus)

  const domainApi = await createConnection(TEST_CONFIG.endpoints.domain)

  return {
    consensus: api,
    domain: domainApi,
  }
}

/**
 * Cleanup chains
 */
export const cleanupChains = async (apis: { consensus?: ApiPromise; domain?: ApiPromise }) => {
  if (apis.consensus) await apis.consensus.disconnect()
  if (apis.domain) await apis.domain.disconnect()
}

/**
 * Wait for a specific number of blocks to be produced on the chain.
 *
 * @param api - The API to wait for blocks on
 * @param count - The number of blocks to wait for
 * @param timeoutMs - Maximum time to wait in milliseconds (default: 60000)
 * @throws Error if the required number of blocks isn't produced within the timeout
 */
export const waitForBlocks = async (
  api: ApiPromise,
  count: number,
  timeoutMs = 300000,
): Promise<void> => {
  const initialHeader = await api.rpc.chain.getHeader()
  const initialBlockNumber = initialHeader.number.toNumber()
  const targetBlockNumber = initialBlockNumber + count
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    const header = await api.rpc.chain.getHeader()
    const currentBlockNumber = header.number.toNumber()

    if (currentBlockNumber >= targetBlockNumber) {
      return
    }

    await sleep(2000)
  }

  throw new Error(
    `Did not reach block ${targetBlockNumber} within ${timeoutMs}ms. Current block: ${await api.rpc.chain.getHeader().then((h) => h.number.toNumber())}`,
  )
}

/**
 * Wait until a condition is met
 * @param condition - The condition to wait for
 * @param timeoutMs - The maximum time to wait in milliseconds (default: 300000)
 * @throws Error if the condition isn't met within the timeout
 */
export const waitUntil = async (condition: () => Promise<boolean>, timeoutMs = 300000) => {
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) {
      return
    }

    await sleep(2000)
  }

  throw new Error(`Condition not met within ${timeoutMs}ms`)
}
