import { operator, operators } from '@autonomys/auto-consensus'
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { getApi, handleError } from './utils.js'

export const createStakingHandlers = () => {
  return {
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
              text: JSON.stringify(operatorInfo, null, 2),
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

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  totalOperators: operatorList.length,
                  operators: operatorList,
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
