import { decompressFile } from '../compression/index.js'
import { decryptFile } from '../encryption/index.js'
import {
  CompressionAlgorithm,
  EncryptionAlgorithm,
  FileUploadOptions,
  OffchainMetadata,
} from '../metadata/index.js'

export type FileData = {
  name: string
  rawData?: string
  dataArrayBuffer: ArrayBuffer
  isEncrypted: boolean
  uploadOptions: FileUploadOptions
}

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

export const detectFileType = async (arrayBuffer: ArrayBuffer): Promise<string> => {
  const bytes = [...new Uint8Array(arrayBuffer.slice(0, 4))]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()

  // File type magic numbers and corresponding types
  const magicNumbers = {
    '89504E47': 'image/png',
    FFD8FFE0: 'image/jpeg', // JPEG start of image marker
    FFD8FFE1: 'image/jpeg', // JPEG EXIF
    FFD8FFE2: 'image/jpeg', // JPEG EXIF
    FFD8FFE3: 'image/jpeg', // JPEG EXIF
    FFD8FFE8: 'image/jpeg', // JPEG SPIFF
    FFD8FFDB: 'image/jpeg', // JPEG quantization table marker
    FFD8FFEE: 'image/jpeg', // JPEG comment marker
    '47494638': 'image/gif',
    '25504446': 'application/pdf',
    '504B0304': 'application/zip', // Also covers .docx, .xlsx, etc.
    '1F8B08': 'application/gzip',
    '504B34': 'application/jar',
    '494433': 'audio/mp3',
    '000001BA': 'video/mpeg',
    '000001B3': 'video/mpeg',
    '66747970': 'video/mp4', // Part of MP4 signature
    '3C3F786D': 'image/svg+xml', // SVG XML declaration <?xml
    '3C737667': 'image/svg+xml', // SVG starting with <svg
    '252150532D': 'application/postscript', // EPS files start with %!PS-
    '4D5A': 'application/exe', // Windows executable
    CAFEBABE: 'application/java', // Java class file
    D0CF11E0: 'application/msword', // Microsoft Office document
    '377ABCAF271C': 'application/7z', // 7-Zip archive
    '52617221': 'application/rar', // RAR archive
    '424D': 'image/bmp', // Bitmap image
    '49492A00': 'image/tiff', // TIFF image
    '4D4D002A': 'image/tiff', // TIFF image
    '1A45DFA3': 'video/webm', // WebM video
    '00000100': 'image/x-icon', // ICO file
    '4F676753': 'audio/ogg', // OGG audio
    '52494646': 'audio/wav', // WAV audio
    '2E524D46': 'audio/aiff', // AIFF audio
    '00000020': 'video/quicktime', // QuickTime video
    '3026B2758E66CF11': 'video/x-ms-wmv', // WMV video
    '4D546864': 'audio/midi', // MIDI audio
    '1F9D': 'application/tar-compressed', // TAR compressed file
    '1FA0': 'application/tar-compressed', // TAR compressed file
    '7573746172': 'application/tar', // TAR archive
    '3C21444F43545950452068746D6C3E': 'text/html', // HTML document
    '3C48544D4C3E': 'text/html', // HTML document
    '3C3F786D6C20': 'application/xml', // XML document
    '3C3F786D6C': 'application/xml', // XML document
    '49443303': 'audio/mpeg', // MP3 audio
    '38425053': 'application/psd', // Adobe Photoshop file
    '7B5C727466': 'application/rtf', // RTF document
    '3C21454E54495459': 'text/html', // HTML document
    '4D5A9000': 'application/exe', // Windows executable
  }

  // Check the magic number against known file types
  for (const [signature, type] of Object.entries(magicNumbers)) {
    if (bytes.startsWith(signature)) {
      return type
    }
  }

  return 'application/octet-stream' // File type not recognized
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

// Helper function to determine if a file can be displayed directly via URL
export const canDisplayDirectly = (metadata: OffchainMetadata): boolean => {
  if (metadata.uploadOptions?.encryption) return false // Encrypted files need decryption

  const extension = metadata.name?.split('.').pop()?.toLowerCase() || ''
  const mimeType = 'mimeType' in metadata ? (metadata.mimeType as string)?.toLowerCase() || '' : ''

  // Media files that can be displayed directly
  const directDisplayTypes = [
    // Images
    'image/',
    // Videos
    'video/',
    // Audio
    'audio/',
    // PDFs
    'application/pdf',
  ]

  const directDisplayExtensions = [
    // Images
    'jpg',
    'jpeg',
    'png',
    'gif',
    'svg',
    'webp',
    'bmp',
    'ico',
    // Videos
    'mp4',
    'webm',
    'avi',
    'mov',
    'mkv',
    'flv',
    'wmv',
    // Audio
    'mp3',
    'wav',
    'ogg',
    'flac',
    'm4a',
    'aac',
    // PDFs
    'pdf',
  ]

  return (
    directDisplayTypes.some((type) => mimeType.startsWith(type)) ||
    directDisplayExtensions.includes(extension)
  )
}

// Helper function to determine if a file needs content parsing
export const needsContentParsing = (metadata: OffchainMetadata): boolean => {
  const extension = metadata.name?.split('.').pop()?.toLowerCase() || ''
  const mimeType = 'mimeType' in metadata ? (metadata.mimeType as string)?.toLowerCase() || '' : ''

  // Text files and JSON files need content parsing
  const textTypes = ['text/']
  const textExtensions = [
    'js',
    'jsx',
    'ts',
    'tsx',
    'html',
    'css',
    'py',
    'java',
    'rb',
    'go',
    'rust',
    'php',
    'txt',
    'md',
    'xml',
    'csv',
    'json',
  ]

  return (
    textTypes.some((type) => mimeType.startsWith(type)) ||
    textExtensions.includes(extension) ||
    mimeType === 'application/json'
  )
}

export const processFileData = async (fileData: FileData) => {
  const fileType = await detectFileType(fileData.dataArrayBuffer)
  const blob = new Blob([fileData.dataArrayBuffer], { type: fileType })
  return blob
}
