import { bufferToAsyncIterable, fileToIterable } from '@autonomys/asynchronous'
import { GenericFile } from '../api/models/file'

const precomputeCidFromGenericFile = async (file: GenericFile) => {
  const { processFileToIPLDFormat } = await import('@autonomys/auto-dag-data')
  const { MemoryBlockstore } = await import('blockstore-core')

  const blockstore = new MemoryBlockstore()
  return processFileToIPLDFormat(blockstore, file.read(), BigInt(file.size), file.name)
}

const precomputeCidFromBuffer = async (buffer: Buffer, name?: string) => {
  const { processFileToIPLDFormat } = await import('@autonomys/auto-dag-data')
  const { MemoryBlockstore } = await import('blockstore-core')

  const blockstore = new MemoryBlockstore()
  return processFileToIPLDFormat(
    blockstore,
    bufferToAsyncIterable(buffer),
    BigInt(buffer.byteLength),
    name,
  )
}

const precomputeCidFromFile = async (file: File | Blob, name?: string) => {
  const { processFileToIPLDFormat } = await import('@autonomys/auto-dag-data')
  const { MemoryBlockstore } = await import('blockstore-core')

  const blockstore = new MemoryBlockstore()
  return processFileToIPLDFormat(blockstore, fileToIterable(file), BigInt(file.size), name)
}

const isGenericFile = (file: File | GenericFile | Buffer): file is GenericFile => {
  return 'read' in file && typeof file.read === 'function'
}

const isBuffer = (file: File | GenericFile | Buffer): file is Buffer => {
  return file instanceof Buffer
}

/**
 * Precompute the CID of a file
 * @param file - The file to precompute the CID of
 * @param name - The name of the file (ignored if file is a GenericFile)
 * @returns The CID of the file
 */
export const precomputeCid = async (file: File | GenericFile | Buffer, name?: string) => {
  const { cidToString } = await import('@autonomys/auto-dag-data')

  if (isGenericFile(file)) {
    return cidToString(await precomputeCidFromGenericFile(file))
  } else if (isBuffer(file)) {
    return cidToString(await precomputeCidFromBuffer(file, name))
  } else {
    return cidToString(await precomputeCidFromFile(file, name))
  }
}

export const blake3Hash = async (cid: string) => {
  const { blake3HashFromCid, stringToCid } = await import('@autonomys/auto-dag-data')

  return Buffer.from(blake3HashFromCid(stringToCid(cid)))
}

export const cidStringFromBlake3Hash = async (hash: Buffer) => {
  const { cidToString, cidFromBlakeHash } = await import('@autonomys/auto-dag-data')

  return cidToString(cidFromBlakeHash(hash))
}
