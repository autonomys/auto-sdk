import { NetworkId } from '@autonomys/auto-utils'

export const networks: Partial<Record<NetworkId, string>> = {
  [NetworkId.TAURUS]: 'https://demo.auto-drive.autonomys.xyz/api',
}

export const getNetworkUrl = (networkId: NetworkId) => {
  if (!networks[networkId]) {
    throw new Error(`Network ${networkId} not found`)
  }

  return networks[networkId]
}
