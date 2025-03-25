// file: src/transfer.ts

import type { ApiPromise, Codec } from '@autonomys/auto-utils'

export const initiateChannel = async (api: ApiPromise, destination: Codec) => {
  return await api.tx.messenger.initiateChannel(destination)
}

export const closeChannel = async (api: ApiPromise, chainId: Codec, channelId: string) => {
  return await api.tx.messenger.closeChannel(chainId, channelId)
}
