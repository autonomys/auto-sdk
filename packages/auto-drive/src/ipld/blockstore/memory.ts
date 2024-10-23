import { MemoryBlockstore } from 'blockstore-core'
import { Pair } from 'interface-blockstore'
import { AbortOptions, AwaitIterable } from 'interface-store'
import { CID, Version } from 'multiformats'
import { decodeIPLDNodeData, MetadataType } from '../../metadata/index.js'
import { IPLDBlockstore } from './base.js'

export class MemoryIPLDBlockstore extends MemoryBlockstore implements IPLDBlockstore {
  private readonly nodeByType = new Map<MetadataType, CID[]>()
  async *getFilteredMany(nodeType: MetadataType, options?: AbortOptions): AwaitIterable<Pair> {
    for await (const pair of this.getAll()) {
      try {
        options?.signal?.throwIfAborted()
        const data = decodeIPLDNodeData(pair.block)
        if (data.type === nodeType) {
          yield pair
        }
      } catch (error) {
        continue
      }
    }
  }

  async put(
    key: CID<unknown, number, number, Version>,
    val: Uint8Array,
  ): Promise<CID<unknown, number, number, Version>> {
    const data = decodeIPLDNodeData(val)
    this.nodeByType.set(data.type, [...(this.nodeByType.get(data.type) ?? []), key])
    return super.put(key, val)
  }
}
