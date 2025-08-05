/* eslint-disable @typescript-eslint/no-explicit-any */
// file: src/info.ts

import type {
  AnyTuple,
  Api,
  ApiPromise,
  BlockHash,
  Codec,
  Header,
  SignedBlock,
  StorageKey,
} from '@autonomys/auto-utils'
import { parseBlockExtrinsics, parseBlockTransfers } from './utils/parse'
import { queryMethodPath } from './utils/query'

const PIECE_SIZE = BigInt(1048576)

/**
 * Executes an RPC call on the blockchain API.
 *
 * This is a generic function that allows calling any RPC method available on the blockchain API.
 * RPC calls are remote procedure calls that interact with the blockchain node.
 *
 * @param api - The connected API instance
 * @param methodPath - The RPC method path (e.g., 'chain.getHeader', 'system.health')
 * @param params - Array of parameters to pass to the RPC method
 * @returns Promise that resolves to the RPC call result
 * @throws Error if the RPC call fails or method path is invalid
 *
 * @example
 * ```typescript
 * import { rpc } from '@autonomys/auto-consensus'
 * import { activate } from '@autonomys/auto-utils'
 *
 * const api = await activate({ networkId: 'mainnet' })
 * const header = await rpc(api, 'chain.getHeader', [])
 * const health = await rpc(api, 'system.health', [])
 * ```
 */
export const rpc = async <T>(api: Api, methodPath: string, params: any[] = []): Promise<T> =>
  await queryMethodPath<T>(api, `rpc.${methodPath}`, params)

/**
 * Executes a storage query on the blockchain API.
 *
 * This is a generic function that allows querying any storage item available on the blockchain.
 * Storage queries retrieve data that is stored on-chain in the blockchain's state.
 *
 * @param api - The connected API instance
 * @param methodPath - The storage query path (e.g., 'system.account', 'balances.totalIssuance')
 * @param params - Array of parameters to pass to the storage query
 * @returns Promise that resolves to the storage query result
 * @throws Error if the storage query fails or method path is invalid
 *
 * @example
 * ```typescript
 * import { query } from '@autonomys/auto-consensus'
 * import { activate } from '@autonomys/auto-utils'
 *
 * const api = await activate({ networkId: 'mainnet' })
 * const totalIssuance = await query(api, 'balances.totalIssuance', [])
 * const accountData = await query(api, 'system.account', ['5GrwvaEF5z...'])
 * ```
 */
export const query = async <T>(api: Api, methodPath: string, params: any[] = []): Promise<T> =>
  await queryMethodPath<T>(api, `query.${methodPath}`, params)

/**
 * Retrieves the header information of the latest block.
 *
 * The block header contains metadata about a block including its number, parent hash,
 * state root, and extrinsics root. This function gets the header of the current latest block.
 *
 * @param api - The connected API instance
 * @returns Promise that resolves to the block Header
 * @throws Error if the header query fails
 *
 * @example
 * ```typescript
 * import { header } from '@autonomys/auto-consensus'
 * import { activate } from '@autonomys/auto-utils'
 *
 * const api = await activate({ networkId: 'mainnet' })
 * const blockHeader = await header(api)
 * console.log(`Block number: ${blockHeader.number}`)
 * console.log(`Parent hash: ${blockHeader.parentHash}`)
 * ```
 */
export const header = async (api: Api) => await rpc<Header>(api, 'chain.getHeader', [])

/**
 * Retrieves a complete block including its extrinsics.
 *
 * This function fetches a full block with all its transaction data (extrinsics).
 * If no block hash is provided, it returns the latest block.
 *
 * @param api - The connected API instance
 * @param blockHash - Optional block hash to fetch a specific block
 * @returns Promise that resolves to a SignedBlock containing all block data
 * @throws Error if the block query fails
 *
 * @example
 * ```typescript
 * import { block } from '@autonomys/auto-consensus'
 * import { activate } from '@autonomys/auto-utils'
 *
 * const api = await activate({ networkId: 'mainnet' })
 *
 * // Get latest block
 * const latestBlock = await block(api)
 *
 * // Get specific block by hash
 * const specificBlock = await block(api, '0x1234...')
 * ```
 */
export const block = async (api: Api, blockHash?: string) =>
  await rpc<SignedBlock>(api, 'chain.getBlock', [blockHash])

/**
 * Retrieves and parses all extrinsics from a block.
 *
 * Extrinsics are transactions or operations that modify the blockchain state.
 * This function fetches a block and extracts all extrinsics in a parsed format
 * for easier consumption.
 *
 * @param api - The connected API instance
 * @param blockHash - Optional block hash to fetch extrinsics from a specific block
 * @returns Promise that resolves to an array of parsed Extrinsic objects
 * @throws Error if the block query or parsing fails
 *
 * @example
 * ```typescript
 * import { blockExtrinsics } from '@autonomys/auto-consensus'
 * import { activate } from '@autonomys/auto-utils'
 *
 * const api = await activate({ networkId: 'mainnet' })
 * const extrinsics = await blockExtrinsics(api)
 *
 * extrinsics.forEach(ext => {
 *   console.log(`${ext.section}.${ext.method} by ${ext.signer}`)
 * })
 * ```
 */
export const blockExtrinsics = async (api: Api, blockHash?: string) =>
  await block(api, blockHash).then((block) => parseBlockExtrinsics(block))

/**
 * Retrieves and parses all transfer-related extrinsics from a block.
 *
 * This function filters extrinsics to only include those related to token transfers,
 * such as balance transfers and cross-chain transfers. It's useful for tracking
 * token movement within a specific block.
 *
 * @param api - The connected API instance
 * @param blockHash - Optional block hash to fetch transfers from a specific block
 * @returns Promise that resolves to an array of transfer Extrinsic objects
 * @throws Error if the block query or parsing fails
 *
 * @example
 * ```typescript
 * import { blockTransfers } from '@autonomys/auto-consensus'
 * import { activate } from '@autonomys/auto-utils'
 *
 * const api = await activate({ networkId: 'mainnet' })
 * const transfers = await blockTransfers(api)
 *
 * console.log(`Found ${transfers.length} transfers in latest block`)
 * ```
 */
export const blockTransfers = async (api: Api, blockHash?: string) =>
  await block(api, blockHash).then((block) => parseBlockTransfers(block))

/**
 * Retrieves the current block number.
 *
 * This function gets the block number of the latest block on the blockchain.
 * Block numbers increment sequentially as new blocks are produced.
 *
 * @param api - The connected API instance
 * @returns Promise that resolves to the current block number as a number
 * @throws Error if the block query fails
 *
 * @example
 * ```typescript
 * import { blockNumber } from '@autonomys/auto-consensus'
 * import { activate } from '@autonomys/auto-utils'
 *
 * const api = await activate({ networkId: 'mainnet' })
 * const currentBlock = await blockNumber(api)
 * console.log(`Current block: ${currentBlock}`)
 * ```
 */
export const blockNumber = async (api: Api): Promise<number> => {
  const _block = await block(api)
  return parseInt(_block.block.header.number.toString())
}

/**
 * Retrieves the hash of a block.
 *
 * This function gets the hash of a specific block by its number, or the latest
 * block hash if no block number is provided. Block hashes are unique identifiers
 * for each block.
 *
 * @param api - The connected API instance
 * @param blockNumber - Optional block number to get hash for specific block
 * @returns Promise that resolves to the block hash as a hex string
 * @throws Error if the block hash query fails
 *
 * @example
 * ```typescript
 * import { blockHash } from '@autonomys/auto-consensus'
 * import { activate } from '@autonomys/auto-utils'
 *
 * const api = await activate({ networkId: 'mainnet' })
 *
 * // Get latest block hash
 * const latestHash = await blockHash(api)
 *
 * // Get hash of specific block
 * const specificHash = await blockHash(api, 1000)
 * ```
 */
export const blockHash = async (api: Api, blockNumber?: number) => {
  const _blockHash = await rpc<BlockHash>(api, 'chain.getBlockHash', [blockNumber])
  return _blockHash.toString()
}

/**
 * Retrieves the hash of the finalized head block.
 *
 * The finalized head is the latest block that has been finalized by the consensus
 * mechanism and is considered irreversible. This provides the hash of that block.
 *
 * @param api - The connected API instance
 * @returns Promise that resolves to the finalized head block hash
 * @throws Error if the finalized head query fails
 *
 * @example
 * ```typescript
 * import { finalizedHead } from '@autonomys/auto-consensus'
 * import { activate } from '@autonomys/auto-utils'
 *
 * const api = await activate({ networkId: 'mainnet' })
 * const finalizedHash = await finalizedHead(api)
 * console.log(`Finalized block hash: ${finalizedHash}`)
 * ```
 */
export const finalizedHead = async (api: Api) =>
  await rpc<BlockHash>(api, 'chain.getFinalizedHead', [])

/**
 * Retrieves the current network timestamp.
 *
 * This function gets the timestamp of the current block, which represents
 * the time when the block was produced. The timestamp is set by block producers
 * and represents network time.
 *
 * @param api - The connected API instance
 * @returns Promise that resolves to the network timestamp as a Codec
 * @throws Error if the timestamp query fails
 *
 * @example
 * ```typescript
 * import { networkTimestamp } from '@autonomys/auto-consensus'
 * import { activate } from '@autonomys/auto-utils'
 *
 * const api = await activate({ networkId: 'mainnet' })
 * const timestamp = await networkTimestamp(api)
 * const networkTime = new Date(Number(timestamp.toString()))
 * console.log(`Network time: ${networkTime}`)
 * ```
 */
export const networkTimestamp = async (api: Api) => await query<Codec>(api, 'timestamp.now', [])

/**
 * Retrieves the current solution ranges for the consensus mechanism.
 *
 * Solution ranges are used in the Proof of Archival Storage consensus to determine
 * the difficulty of finding valid solutions. This includes current and next solution
 * ranges for both regular consensus and voting.
 *
 * @param api - The connected API instance
 * @returns Promise that resolves to solution ranges object with current/next values
 * @throws Error if the solution ranges query fails
 *
 * @example
 * ```typescript
 * import { solutionRanges } from '@autonomys/auto-consensus'
 * import { activate } from '@autonomys/auto-utils'
 *
 * const api = await activate({ networkId: 'mainnet' })
 * const ranges = await solutionRanges(api)
 * console.log(`Current solution range: ${ranges.current}`)
 * console.log(`Next solution range: ${ranges.next}`)
 * ```
 */
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

/**
 * Checks if the solution range should be adjusted.
 *
 * This function queries whether the consensus mechanism has determined that
 * the solution range needs to be adjusted based on network conditions.
 *
 * @param api - The connected API instance
 * @returns Promise that resolves to boolean indicating if adjustment is needed
 * @throws Error if the query fails
 *
 * @example
 * ```typescript
 * import { shouldAdjustSolutionRange } from '@autonomys/auto-consensus'
 * import { activate } from '@autonomys/auto-utils'
 *
 * const api = await activate({ networkId: 'mainnet' })
 * const shouldAdjust = await shouldAdjustSolutionRange(api)
 * console.log(`Solution range adjustment needed: ${shouldAdjust}`)
 * ```
 */
export const shouldAdjustSolutionRange = async (api: Api): Promise<boolean> =>
  await query<boolean>(api, 'subspace.shouldAdjustSolutionRange', [])

/**
 * Retrieves segment commitment information.
 *
 * Segment commitments are cryptographic commitments to data segments in the
 * Autonomys network's decentralized storage system. This function retrieves
 * all current segment commitments.
 *
 * @param api - The connected API instance
 * @returns Promise that resolves to array of segment commitment entries
 * @throws Error if the segment commitment query fails
 *
 * @example
 * ```typescript
 * import { segmentCommitment } from '@autonomys/auto-consensus'
 * import { activate } from '@autonomys/auto-utils'
 *
 * const api = await activate({ networkId: 'mainnet' })
 * const commitments = await segmentCommitment(api)
 * console.log(`Found ${commitments.length} segment commitments`)
 * ```
 */
export const segmentCommitment = async (api: Api) => {
  if ((api as ApiPromise).at) {
    const { parentHash } = await header(api)
    api = await (api as ApiPromise).at(parentHash)
  }
  return await query<[StorageKey<AnyTuple>, Codec][]>(api, 'subspace.segmentCommitment.entries', [])
}

/**
 * Retrieves the slot probability configuration.
 *
 * Slot probability defines the likelihood that a farmer will be able to produce
 * a block in any given slot. It's returned as a fraction [numerator, denominator].
 *
 * @param api - The connected API instance
 * @returns Tuple representing slot probability as [numerator, denominator]
 *
 * @example
 * ```typescript
 * import { slotProbability } from '@autonomys/auto-consensus'
 * import { activate } from '@autonomys/auto-utils'
 *
 * const api = await activate({ networkId: 'mainnet' })
 * const [num, den] = slotProbability(api)
 * console.log(`Slot probability: ${num}/${den} = ${num/den}`)
 * ```
 */
export const slotProbability = (api: Api): [number, number] =>
  api.consts.subspace.slotProbability.toPrimitive() as [number, number]

/**
 * Retrieves the maximum number of pieces that can fit in a sector.
 *
 * In the Autonomys storage system, data is organized into pieces and sectors.
 * This function returns the maximum number of pieces that can be stored in
 * a single sector.
 *
 * @param api - The connected API instance
 * @returns Maximum pieces per sector as a bigint
 *
 * @example
 * ```typescript
 * import { maxPiecesInSector } from '@autonomys/auto-consensus'
 * import { activate } from '@autonomys/auto-utils'
 *
 * const api = await activate({ networkId: 'mainnet' })
 * const maxPieces = maxPiecesInSector(api)
 * console.log(`Max pieces per sector: ${maxPieces}`)
 * ```
 */
export const maxPiecesInSector = (api: Api): bigint =>
  BigInt(api.consts.subspace.maxPiecesInSector.toPrimitive() as number)

/**
 * Converts solution range to the equivalent number of pieces.
 *
 * This utility function converts a solution range value to the equivalent
 * number of pieces that would need to be stored to achieve that solution range,
 * taking into account the slot probability.
 *
 * @param solutionRange - The solution range value to convert
 * @param slotProbability - Slot probability as [numerator, denominator] tuple
 * @returns Number of pieces equivalent to the solution range
 *
 * @example
 * ```typescript
 * import { solutionRangeToPieces, solutionRanges, slotProbability } from '@autonomys/auto-consensus'
 * import { activate } from '@autonomys/auto-utils'
 *
 * const api = await activate({ networkId: 'mainnet' })
 * const ranges = await solutionRanges(api)
 * const slotProb = slotProbability(api)
 *
 * if (ranges.current) {
 *   const pieces = solutionRangeToPieces(ranges.current, [BigInt(slotProb[0]), BigInt(slotProb[1])])
 *   console.log(`Current solution range equals ${pieces} pieces`)
 * }
 * ```
 */
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

/**
 * Calculates the total space pledged to the network.
 *
 * This function calculates the total amount of storage space that has been
 * pledged to the Autonomys network by farmers, based on the current solution
 * range and slot probability.
 *
 * @param api - The connected API instance
 * @returns Promise that resolves to total pledged space in bytes as bigint
 * @throws Error if unable to retrieve solution ranges or calculate space
 *
 * @example
 * ```typescript
 * import { spacePledged } from '@autonomys/auto-consensus'
 * import { activate } from '@autonomys/auto-utils'
 *
 * const api = await activate({ networkId: 'mainnet' })
 * const pledgedSpace = await spacePledged(api)
 * const pledgedGB = Number(pledgedSpace) / (1024 ** 3)
 * console.log(`Total pledged space: ${pledgedGB.toFixed(2)} GB`)
 * ```
 */
export const spacePledged = async (api: Api): Promise<bigint> => {
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

/**
 * @deprecated Use spacePledged instead. This function will be removed in a future major release.
 *
 * Calculates the total space pledged to the network.
 *
 * @param api - The connected API instance
 * @returns Promise that resolves to total pledged space in bytes as bigint
 */
// This function is deprecated (use spacePledged instead) and will be removed in a future major release
export const spacePledge = async (api: Api): Promise<bigint> => {
  console.warn(
    'spacePledge is deprecated (use spacePledged instead) and will be removed in a future major release',
  )
  return spacePledged(api)
}

/**
 * Calculates the total blockchain size.
 *
 * This function calculates the total size of the blockchain by counting
 * the number of segment commitments and multiplying by the size per segment.
 * This represents the total amount of data stored in the blockchain.
 *
 * @param api - The connected API instance
 * @returns Promise that resolves to total blockchain size in bytes as bigint
 * @throws Error if unable to retrieve segment commitments
 *
 * @example
 * ```typescript
 * import { blockchainSize } from '@autonomys/auto-consensus'
 * import { activate } from '@autonomys/auto-utils'
 *
 * const api = await activate({ networkId: 'mainnet' })
 * const totalSize = await blockchainSize(api)
 * const sizeGB = Number(totalSize) / (1024 ** 3)
 * console.log(`Blockchain size: ${sizeGB.toFixed(2)} GB`)
 * ```
 */
export const blockchainSize = async (api: Api): Promise<bigint> => {
  const _segmentCommitment = await segmentCommitment(api)
  const segmentsCount = BigInt(_segmentCommitment.length)

  const blockchainSize = PIECE_SIZE * BigInt(256) * segmentsCount
  return blockchainSize
}
