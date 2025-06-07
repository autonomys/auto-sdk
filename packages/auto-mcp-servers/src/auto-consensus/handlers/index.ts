import { createChainHandlers } from './chain.js'
import { createStakingHandlers } from './staking.js'
import { cleanupConnections } from './utils.js'

export const createConsensusHandlers = () => {
  const chainHandlers = createChainHandlers()
  const stakingHandlers = createStakingHandlers()

  return {
    ...chainHandlers,
    ...stakingHandlers,
  }
}

// Export cleanup function for graceful shutdown
export { cleanupConnections }
