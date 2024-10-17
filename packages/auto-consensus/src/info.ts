// file: src/info.ts

import { AnyTuple, Api, Codec, StorageKey } from '@autonomys/auto-utils'
import { RawBlock } from './types/block'
import { queryMethodPath } from './utils/query'

const PIECE_SIZE = BigInt(1048576)

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

export const shouldAdjustSolutionRange = async (api: Api): Promise<boolean> =>
  await query<boolean>(api, 'subspace.shouldAdjustSolutionRange', [])

export const segmentCommitment = async (api: Api) =>
  await query<[StorageKey<AnyTuple>, Codec][]>(api, 'subspace.segmentCommitment', [])

export const slotProbability = (api: Api): [number, number] =>
  api.consts.subspace.slotProbability.toPrimitive() as [number, number]

export const maxPiecesInSector = (api: Api): bigint =>
  BigInt(api.consts.subspace.maxPiecesInSector.toPrimitive() as number)

export function solutionRangeToPieces(
  solutionRange: bigint,
  slotProbability: [bigint, bigint],
): bigint {
  const MAX_U64 = BigInt(2 ** 64 - 1)
  const RECORD_NUM_CHUNKS = BigInt(32768)
  const RECORD_NUM_S_BUCKETS = BigInt(65536)

  const pieces =
    (((MAX_U64 / slotProbability[1]) * slotProbability[0]) / RECORD_NUM_CHUNKS) *
    RECORD_NUM_S_BUCKETS

  return pieces / solutionRange
}

export const spacePledge = async (api: Api): Promise<bigint> => {
  const _solutionRanges = await solutionRanges(api)
  const _slotProbability = slotProbability(api)

  if (!_solutionRanges.current || !_slotProbability) return BigInt(0)

  const pieces = solutionRangeToPieces(_solutionRanges.current, [
    BigInt(_slotProbability[0]),
    BigInt(_slotProbability[1]),
  ])
  const totalSpacePledged = pieces * PIECE_SIZE

  return totalSpacePledged
}

export const blockchainSize = async (api: Api): Promise<bigint> => {
  const _segmentCommitment = await segmentCommitment(api)
  const segmentsCount = BigInt(_segmentCommitment.length)

  const blockchainSize = PIECE_SIZE * BigInt(256) * segmentsCount
  return blockchainSize
}
