import {
  account,
  balance,
  blockchainSize,
  blockHash,
  blockNumber,
  operator,
  operators,
  spacePledged,
  totalIssuance,
} from '@autonomys/auto-consensus'
import {
  activate,
  disconnect,
  getNetworkDetails,
  parseTokenAmount,
  type ApiPromise,
} from '@autonomys/auto-utils'
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

// Connection management
const apiConnections: Map<string, ApiPromise> = new Map()

const getApi = async (networkId?: string): Promise<ApiPromise> => {
  const network = networkId || 'mainnet'

  if (!apiConnections.has(network)) {
    const api = await activate({ networkId: network })
    apiConnections.set(network, api)
  }

  return apiConnections.get(network)!
}

const handleError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

const getTokenSymbol = (networkId?: string): string => {
  const network = networkId || 'mainnet'
  const networkDetails = getNetworkDetails({ networkId: network })
  return networkDetails.token.symbol
}

export const createConsensusHandlers = () => {
  return {
    // Account handlers
    getAccountInfoHandler: async ({
      address,
      networkId,
    }: {
      address: string
      networkId?: string
    }): Promise<CallToolResult> => {
      try {
        const api = await getApi(networkId)
        const accountData = await account(api, address)

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  address,
                  nonce: accountData.nonce.toString(),
                  data: {
                    free: accountData.data.free.toString(),
                    reserved: accountData.data.reserved.toString(),
                    frozen: accountData.data.frozen.toString(),
                    flags: accountData.data.flags.toString(),
                  },
                },
                null,
                2,
              ),
            },
          ],
        }
      } catch (error) {
        console.error('Failed to get account info:', error)
        return {
          isError: true,
          content: [{ type: 'text', text: `Error getting account info: ${handleError(error)}` }],
        }
      }
    },

    getBalanceHandler: async ({
      address,
      networkId,
    }: {
      address: string
      networkId?: string
    }): Promise<CallToolResult> => {
      try {
        const api = await getApi(networkId)
        const balanceData = await balance(api, address)

        const freeFormatted = parseTokenAmount(balanceData.free.toString())
        const reservedFormatted = parseTokenAmount(balanceData.reserved.toString())
        const totalFormatted = parseTokenAmount(
          (balanceData.free + balanceData.reserved).toString(),
        )

        const tokenSymbol = getTokenSymbol(networkId)

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  address,
                  free: balanceData.free.toString(),
                  freeFormatted: `${freeFormatted} ${tokenSymbol}`,
                  reserved: balanceData.reserved.toString(),
                  reservedFormatted: `${reservedFormatted} ${tokenSymbol}`,
                  total: (balanceData.free + balanceData.reserved).toString(),
                  totalFormatted: `${totalFormatted} ${tokenSymbol}`,
                },
                null,
                2,
              ),
            },
          ],
        }
      } catch (error) {
        console.error('Failed to get balance:', error)
        return {
          isError: true,
          content: [{ type: 'text', text: `Error getting balance: ${handleError(error)}` }],
        }
      }
    },

    getTotalIssuanceHandler: async ({
      networkId,
    }: {
      networkId?: string
    }): Promise<CallToolResult> => {
      try {
        const issuance = await totalIssuance(networkId)
        const issuanceValue = BigInt(issuance.toString())
        const issuanceFormatted = parseTokenAmount(issuanceValue.toString())

        const tokenSymbol = getTokenSymbol(networkId)

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  totalIssuance: issuanceValue.toString(),
                  totalIssuanceFormatted: `${issuanceFormatted} ${tokenSymbol}`,
                },
                null,
                2,
              ),
            },
          ],
        }
      } catch (error) {
        console.error('Failed to get total issuance:', error)
        return {
          isError: true,
          content: [{ type: 'text', text: `Error getting total issuance: ${handleError(error)}` }],
        }
      }
    },

    // Chain information handlers
    getBlockInfoHandler: async ({
      networkId,
      blockNumber: blockNum,
    }: {
      networkId?: string
      blockNumber?: number
    }): Promise<CallToolResult> => {
      try {
        const api = await getApi(networkId)

        const currentBlockNumber = blockNum || (await blockNumber(api))
        const hash = await blockHash(api, currentBlockNumber)

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  blockNumber: currentBlockNumber,
                  blockHash: hash,
                },
                null,
                2,
              ),
            },
          ],
        }
      } catch (error) {
        console.error('Failed to get block info:', error)
        return {
          isError: true,
          content: [{ type: 'text', text: `Error getting block info: ${handleError(error)}` }],
        }
      }
    },

    getSpacePledgedHandler: async ({
      networkId,
    }: {
      networkId?: string
    }): Promise<CallToolResult> => {
      try {
        const api = await getApi(networkId)
        const pledged = await spacePledged(api)

        // Convert to human-readable format (e.g., PiB)
        const pledgedInBytes = Number(pledged)
        const pledgedInPiB = pledgedInBytes / 1024 ** 5 // Convert to PiB

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  spacePledged: pledged.toString(),
                  spacePledgedBytes: pledgedInBytes,
                  spacePledgedPiB: pledgedInPiB.toFixed(2),
                },
                null,
                2,
              ),
            },
          ],
        }
      } catch (error) {
        console.error('Failed to get space pledged:', error)
        return {
          isError: true,
          content: [{ type: 'text', text: `Error getting space pledged: ${handleError(error)}` }],
        }
      }
    },

    getBlockchainSizeHandler: async ({
      networkId,
    }: {
      networkId?: string
    }): Promise<CallToolResult> => {
      try {
        const api = await getApi(networkId)
        const size = await blockchainSize(api)

        // Convert to human-readable format (e.g., PiB)
        const sizeInBytes = Number(size)
        const sizeInPiB = sizeInBytes / 1024 ** 5 // Convert to PiB

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  blockchainSize: size.toString(),
                  blockchainSizeBytes: sizeInBytes,
                  blockchainSizePiB: sizeInPiB.toFixed(2),
                },
                null,
                2,
              ),
            },
          ],
        }
      } catch (error) {
        console.error('Failed to get blockchain size:', error)
        return {
          isError: true,
          content: [{ type: 'text', text: `Error getting blockchain size: ${handleError(error)}` }],
        }
      }
    },

    // Staking handlers
    getOperatorInfoHandler: async ({
      operatorId,
      networkId,
    }: {
      operatorId: string
      networkId?: string
    }): Promise<CallToolResult> => {
      try {
        const api = await getApi(networkId)
        const operatorInfo = await operator(api, operatorId)

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  operatorId,
                  signingKey: operatorInfo.signingKey,
                  currentDomainId: operatorInfo.currentDomainId.toString(),
                  currentTotalStake: operatorInfo.currentTotalStake.toString(),
                  currentTotalShares: operatorInfo.currentTotalShares.toString(),
                  minimumNominatorStake: operatorInfo.minimumNominatorStake.toString(),
                  nominationTax: operatorInfo.nominationTax,
                  totalStorageFeeDeposit: operatorInfo.totalStorageFeeDeposit.toString(),
                  status: operatorInfo.partialStatus,
                },
                null,
                2,
              ),
            },
          ],
        }
      } catch (error) {
        console.error('Failed to get operator info:', error)
        return {
          isError: true,
          content: [{ type: 'text', text: `Error getting operator info: ${handleError(error)}` }],
        }
      }
    },

    getOperatorsHandler: async ({ networkId }: { networkId?: string }): Promise<CallToolResult> => {
      try {
        const api = await getApi(networkId)
        const operatorList = await operators(api)

        const formattedOperators = operatorList.map((op) => ({
          operatorId: op.operatorId.toString(),
          signingKey: op.operatorDetails.signingKey,
          currentDomainId: op.operatorDetails.currentDomainId.toString(),
          currentTotalStake: op.operatorDetails.currentTotalStake.toString(),
          nominationTax: op.operatorDetails.nominationTax,
        }))

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  totalOperators: operatorList.length,
                  operators: formattedOperators,
                },
                null,
                2,
              ),
            },
          ],
        }
      } catch (error) {
        console.error('Failed to get operators:', error)
        return {
          isError: true,
          content: [{ type: 'text', text: `Error getting operators: ${handleError(error)}` }],
        }
      }
    },
  }
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
