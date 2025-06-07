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
