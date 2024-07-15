// file: src/info.ts

import { activate } from '@autonomys/auto-utils'
import { queryMethodPath } from './utils/query'

export const rpc = async (methodPath: string, params: any[] = [], networkId?: string) =>
  await queryMethodPath(`rpc.${methodPath}`, params, networkId)

export const query = async (methodPath: string, params: any[] = [], networkId?: string) =>
  await queryMethodPath(`query.${methodPath}`, params, networkId)

export const block = async (networkId?: string) => await rpc('chain.getBlock', [], networkId)

export const blockNumber = async (networkId?: string): Promise<number> => {
  // Get the block
  const _block = await block(networkId)

  return _block.block.header.number.toNumber()
}

export const blockHash = async (networkId?: string) => {
  // Get the block
  const _block = await block(networkId)

  return _block.block.header.hash.toString()
}

export const networkTimestamp = async (networkId?: string) =>
  await query('timestamp.now', [], networkId)
