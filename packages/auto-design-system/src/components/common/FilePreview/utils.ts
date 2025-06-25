import {
  CompressionAlgorithm,
  decompressFile,
  decryptFile,
  EncryptionAlgorithm,
} from '@autonomys/auto-dag-data'
import type { FileData } from './types'

// Helper to convert stream to async iterable
export const asyncFromStream = (stream: ReadableStream): AsyncIterable<Buffer> => {
  const reader = stream.getReader()
  return {
    async *[Symbol.asyncIterator]() {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          yield Buffer.from(value)
        }
      } finally {
        reader.releaseLock()
      }
    },
  }
}

// Simple file type detection based on magic bytes
export const detectFileType = async (arrayBuffer: ArrayBuffer): Promise<string> => {
  const bytes = new Uint8Array(arrayBuffer.slice(0, 12))

  // PNG
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png'
  }

  // JPEG
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }

  // GIF
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return 'image/gif'
  }

  // WebP
  if (bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return 'image/webp'
  }

  // SVG (check for XML start and svg tag)
  const text = new TextDecoder().decode(bytes)
  if (text.includes('<svg') || text.includes('<?xml')) {
    return 'image/svg+xml'
  }

  return 'unknown'
}

// Enhanced decryption function that handles both decryption and decompression
export const decryptFileData = async (password: string, fileData: FileData): Promise<FileData> => {
  try {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(fileData.dataArrayBuffer)
        controller.close()
      },
    })

    let iterable = asyncFromStream(stream)
    iterable = decryptFile(iterable, password, {
      algorithm: EncryptionAlgorithm.AES_256_GCM,
    })
    iterable = decompressFile(iterable, {
      algorithm: CompressionAlgorithm.ZLIB,
    })

    const processedChunks: Buffer[] = []
    for await (const chunk of iterable) {
      processedChunks.push(chunk)
    }
    const combined = new Uint8Array(processedChunks.reduce((acc, chunk) => acc + chunk.length, 0))
    let offset = 0
    for (const chunk of processedChunks) {
      combined.set(chunk, offset)
      offset += chunk.length
    }
    fileData.dataArrayBuffer = combined.buffer
    fileData.isEncrypted = false
    return fileData
  } catch (error) {
    throw new Error((error as Error).message)
  }
}
