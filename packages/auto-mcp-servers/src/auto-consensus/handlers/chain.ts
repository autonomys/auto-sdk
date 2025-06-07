import {
  account,
  balance,
  blockchainSize,
  blockHash,
  blockNumber,
  spacePledged,
  totalIssuance,
} from '@autonomys/auto-consensus'
import { parseTokenAmount } from '@autonomys/auto-utils'
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { getApi, getTokenSymbol, handleError } from './utils.js'

export const createChainHandlers = () => {
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
  }
}
