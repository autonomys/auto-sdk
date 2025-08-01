import { NetworkId } from '@autonomys/auto-utils'

export type AutoDriveNetwork = keyof typeof apiEndpoints

export const apiEndpoints = {
  [NetworkId.TAURUS]: 'https://demo.auto-drive.autonomys.xyz/api',
  [NetworkId.MAINNET]: 'https://mainnet.auto-drive.autonomys.xyz/api',
} satisfies Partial<Record<NetworkId, string>>

export const downloadServiceEndpoints = {
  [NetworkId.TAURUS]: 'https://public.taurus.auto-drive.autonomys.xyz/api',
  [NetworkId.MAINNET]: 'https://public.auto-drive.autonomys.xyz/api',
} satisfies Partial<Record<NetworkId, string>>

export const getNetworkUrl = (networkId: AutoDriveNetwork) => {
  if (!apiEndpoints[networkId]) {
    throw new Error(`Network ${networkId} not found`)
  }

  return apiEndpoints[networkId]
}

export const getDownloadServiceUrl = (networkId: AutoDriveNetwork) => {
  if (!downloadServiceEndpoints[networkId]) {
    throw new Error(`Network ${networkId} not found`)
  }

  return downloadServiceEndpoints[networkId]
}
