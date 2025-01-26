import { NetworkId } from '@autonomys/auto-utils'

export type AutoDriveNetwork = keyof typeof networks

export const networks = {
  [NetworkId.TAURUS]: 'https://demo.auto-drive.autonomys.xyz/api',
} satisfies Partial<Record<NetworkId, string>>

export const getNetworkUrl = (networkId: AutoDriveNetwork) => {
  if (!networks[networkId]) {
    throw new Error(`Network ${networkId} not found`)
  }

  return networks[networkId]
}
