import { BaseBlockstore } from 'blockstore-core'
import type { Pair } from 'interface-blockstore'
import { AbortOptions, AwaitIterable } from 'interface-store'
import { MetadataType } from '../../metadata/index.js'

export interface IPLDBlockstore extends BaseBlockstore {
  getFilteredMany(nodeType: MetadataType, options?: AbortOptions): AwaitIterable<Pair['cid']>
  getSize(cid: Pair['cid']): Promise<number>
}
