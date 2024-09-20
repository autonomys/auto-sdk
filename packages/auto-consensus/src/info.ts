// file: src/info.ts

import { Api, Codec } from '@autonomys/auto-utils'
import { Block, RawBlock } from './types/block'
import { queryMethodPath } from './utils/query'

export const rpc = async <T>(api: Api, methodPath: string, params: any[] = []): Promise<T> =>
  await queryMethodPath<T>(api, `rpc.${methodPath}`, params)

export const query = async <T>(api: Api, methodPath: string, params: any[] = []): Promise<T> =>
  await queryMethodPath<T>(api, `query.${methodPath}`, params)

export const block = async <RawBlock>(api: Api) => await rpc<RawBlock>(api, 'chain.getBlock', [])

export const blockNumber = async (api: Api): Promise<number> => {
  // Get the block
  const _block = await block<RawBlock>(api)

  return _block.block.header.number.toNumber()
}

export const blockHash = async (api: Api) => {
  const _blockHash = await rpc<Codec>(api, 'chain.getBlockHash', [])
  return _blockHash.toString()
}

export const networkTimestamp = async (api: Api) => await query<Codec>(api, 'timestamp.now', [])

export const solutionRanges = async (api: Api) => {
  const _solutionRanges = await query<Codec>(api, 'subspace.solutionRanges', [])
  const solution = _solutionRanges.toPrimitive() as {
    current: string
    next: string
    votingCurrent: string
    votingNext: string
  }
  return {
    current: solution.current ? BigInt(solution.current) : null,
    next: solution.next ? BigInt(solution.next) : null,
    votingCurrent: solution.votingCurrent ? BigInt(solution.votingCurrent) : null,
    votingNext: solution.votingNext ? BigInt(solution.votingNext) : null,
  }
}

export const shouldAdjustSolutionRange = async (api: Api) =>
  await query<boolean>(api, 'subspace.shouldAdjustSolutionRange', [])

export const segmentCommitment = async (api: Api) =>
  await query<Codec>(api, 'subspace.segmentCommitment', [])
