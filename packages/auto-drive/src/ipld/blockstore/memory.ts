import { MemoryBlockstore } from 'blockstore-core'
import { Pair } from 'interface-blockstore'
import { AbortOptions, AwaitIterable } from 'interface-store'
import { CID, Version } from 'multiformats'
import { decodeIPLDNodeData, IPLDNodeData, MetadataType } from '../../metadata/index.js'
import { IPLDBlockstore } from './base.js'

export class MemoryIPLDBlockstore extends MemoryBlockstore implements IPLDBlockstore {
  private readonly nodeByType = new Map<MetadataType, CID[]>()
  async *getFilteredMany(
    nodeType: MetadataType,
    options?: AbortOptions,
  ): AwaitIterable<Pair['cid']> {
    for (const cid of this.nodeByType.get(nodeType) ?? []) {
      yield cid
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

  async getSize(cid: CID): Promise<number> {
    const bytes = await this.get(cid)
    const data = decodeIPLDNodeData(bytes)
    return data.size ?? 0
  }
}
