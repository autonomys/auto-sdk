import { ByteRange } from '../../models.js'
import { getNodesForPartialRetrieval, PartialRetrievalChunk } from '../chunks.js'

const chunksOf = (...sizes: number[]): PartialRetrievalChunk[] =>
  sizes.map((size, i) => ({ cid: `cid${i + 1}`, size: BigInt(size) }))

describe('getNodesForPartialRetrieval', () => {
  const chunks = chunksOf(1000, 1000, 1000)

  it('selects only the first chunk for bytes=0-0', () => {
    expect(getNodesForPartialRetrieval(chunks, [0, 0])).toEqual({
      nodes: ['cid1'],
      firstNodeFileOffset: 0,
    })
  })

  it('selects one chunk for a range within it', () => {
    expect(getNodesForPartialRetrieval(chunks, [100, 500])).toEqual({
      nodes: ['cid1'],
      firstNodeFileOffset: 0,
    })
    expect(getNodesForPartialRetrieval(chunks, [1100, 1500])).toEqual({
      nodes: ['cid2'],
      firstNodeFileOffset: 1000,
    })
  })

  it('selects every chunk a range spans', () => {
    expect(getNodesForPartialRetrieval(chunks, [500, 2500])).toEqual({
      nodes: ['cid1', 'cid2', 'cid3'],
      firstNodeFileOffset: 0,
    })
    expect(getNodesForPartialRetrieval(chunks, [999, 1000])).toEqual({
      nodes: ['cid1', 'cid2'],
      firstNodeFileOffset: 0,
    })
  })

  it('selects up to the last chunk for a range ending at the last byte', () => {
    expect(getNodesForPartialRetrieval(chunks, [1500, 2999])).toEqual({
      nodes: ['cid2', 'cid3'],
      firstNodeFileOffset: 1000,
    })
    expect(getNodesForPartialRetrieval(chunks, [2999, 2999])).toEqual({
      nodes: ['cid3'],
      firstNodeFileOffset: 2000,
    })
  })

  it('selects to the end of the file for an open-ended range', () => {
    expect(getNodesForPartialRetrieval(chunks, [1500, undefined])).toEqual({
      nodes: ['cid2', 'cid3'],
      firstNodeFileOffset: 1000,
    })
    expect(getNodesForPartialRetrieval(chunks, [0, undefined])).toEqual({
      nodes: ['cid1', 'cid2', 'cid3'],
      firstNodeFileOffset: 0,
    })
  })

  it('selects to the end of the file for an end past the last byte', () => {
    expect(getNodesForPartialRetrieval(chunks, [1500, 5000])).toEqual({
      nodes: ['cid2', 'cid3'],
      firstNodeFileOffset: 1000,
    })
  })

  it('throws when no chunk contains the start', () => {
    expect(() => getNodesForPartialRetrieval(chunksOf(1000), [2000, 3000])).toThrow(
      'Byte range not found',
    )
    expect(() => getNodesForPartialRetrieval(chunksOf(1000), [1000, undefined])).toThrow(
      'Byte range not found',
    )
    expect(() => getNodesForPartialRetrieval([], [0, 0])).toThrow('Byte range not found')
  })

  it('accepts sizes as numbers and treats a missing size as empty', () => {
    const mixed: PartialRetrievalChunk[] = [
      { cid: 'cid1', size: 10 },
      { cid: 'cid2' },
      { cid: 'cid3', size: BigInt(10) },
    ]

    expect(getNodesForPartialRetrieval(mixed, [5, 15])).toEqual({
      nodes: ['cid1', 'cid2', 'cid3'],
      firstNodeFileOffset: 0,
    })
    expect(getNodesForPartialRetrieval(mixed, [10, 15])).toEqual({
      nodes: ['cid3'],
      firstNodeFileOffset: 10,
    })
  })

  it.each<[ByteRange, string[], number]>([
    [[0, 99], ['cid1'], 0],
    [[0, 100], ['cid1', 'cid2'], 0],
    [[1, 100], ['cid1', 'cid2'], 0],
    [[0, undefined], ['cid1', 'cid2', 'cid3'], 0],
    [[100, undefined], ['cid2', 'cid3'], 100],
  ])('selects chunks of uneven sizes for %j', (byteRange, nodes, firstNodeFileOffset) => {
    expect(getNodesForPartialRetrieval(chunksOf(100, 100, 50), byteRange)).toEqual({
      nodes,
      firstNodeFileOffset,
    })
  })
})
