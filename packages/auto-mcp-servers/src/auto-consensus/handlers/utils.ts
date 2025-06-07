import { activate, disconnect, getNetworkDetails, type ApiPromise } from '@autonomys/auto-utils'

// Connection management
const apiConnections: Map<string, ApiPromise> = new Map()

export const getApi = async (networkId?: string): Promise<ApiPromise> => {
  const network = networkId || 'mainnet'

  if (!apiConnections.has(network)) {
    const api = await activate({ networkId: network })
    apiConnections.set(network, api)
  }

  return apiConnections.get(network)!
}

export const handleError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

export const getTokenSymbol = (networkId?: string): string => {
  const network = networkId || 'mainnet'
  const networkDetails = getNetworkDetails({ networkId: network })
  return networkDetails.token.symbol
}

// Cleanup function for graceful shutdown
export const cleanupConnections = async () => {
  for (const [key, api] of apiConnections.entries()) {
    try {
      await disconnect(api)
      console.error(`Disconnected API connection: ${key}`)
    } catch (error) {
      console.error(`Error disconnecting API ${key}:`, error)
    }
  }
  apiConnections.clear()
}

// Handle process termination
process.on('SIGINT', async () => {
  await cleanupConnections()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await cleanupConnections()
  process.exit(0)
})
