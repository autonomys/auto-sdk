import {
  CompressionAlgorithm,
  decompressFile,
  decryptFile,
  EncryptionAlgorithm,
  OffchainMetadata,
} from '@autonomys/auto-dag-data'
import { NetworkId } from '@autonomys/auto-utils'
import type { Meta, StoryObj } from '@storybook/react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { FilePreview } from './FilePreview'

// File data interface
interface FileData {
  dataArrayBuffer: ArrayBuffer
  fileName?: string
  isEncrypted?: boolean
}

// Helper to convert stream to async iterable
const asyncFromStream = (stream: ReadableStream): AsyncIterable<Buffer> => {
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
const detectFileType = async (arrayBuffer: ArrayBuffer): Promise<string> => {
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
const decryptFileData = async (password: string, fileData: FileData): Promise<FileData> => {
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

const meta: Meta<typeof FilePreview> = {
  title: 'Common/FilePreview',
  component: FilePreview,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    metadata: {
      control: 'object',
      description: 'The metadata of the file',
    },
  },
}

export default meta
type Story = StoryObj<typeof FilePreview>

const MAX_FILE_SIZE = BigInt(100 * 1024 * 1024) // 100 MB

const EXTERNAL_ROUTES = {
  gatewayObjectDownload: (cid: string) => `https://gateway.autonomys.xyz/file/${cid}`,
}

export const Astral: Story = {
  render: () => {
    const [isFilePreview, setIsFilePreview] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isDecrypted, setIsDecrypted] = useState(false)
    const [decryptionError, setDecryptionError] = useState<string | null>(null)
    const [file, setFile] = useState<Blob | null>(null)
    const [textContent, setTextContent] = useState<string | null>(null)

    const metadata: OffchainMetadata = {
      name: '431950369-2c9d1115-482a-4f06-9ac7-6605a21847c7.mp4',
      type: 'file',
      chunks: [
        {
          cid: 'bafkr6icidbuhnf2o6z4koeenicrl5u23iseesd7z57xipkdaqwtdrwa6ry',
          size: 65066n,
        },
        {
          cid: 'bafkr6iffb6ua6f7dxz6qszscxhzhk4xsxtazfp427asr2sfca4ayxgfrdi',
          size: 65066n,
        },
        {
          cid: 'bafkr6ihbo42s2tjkdc7epddpoyzjh3rtuvzn3dns2bz3zi6a7tfef5saoa',
          size: 65066n,
        },
        {
          cid: 'bafkr6icxyqzuh6laijaoygzpcufton6sl7adiepctrp6ufnbmss2vv42z4',
          size: 65066n,
        },
        {
          cid: 'bafkr6icjspy5uxgqhmmaliq6ar4igvl6qiyijbcyuvh3v46aqmelqcoqne',
          size: 26303n,
        },
      ],
      dataCid: 'bafkr6iguwo5hj3hjixm36i24vspcm7frxnwmluccu3xwmmvvs27mmbao74',
      mimeType: 'image/png',
      totalSize: 286567n,
      totalChunks: 5,
      uploadOptions: {
        compression: {
          algorithm: CompressionAlgorithm.ZLIB,
        },
      },
    }

    const gatewayUrl = useMemo(() => {
      if (metadata.dataCid) {
        return EXTERNAL_ROUTES.gatewayObjectDownload(metadata.dataCid)
      }
      return null
    }, [metadata.dataCid])

    const fetchFile = useCallback(
      async (password?: string) => {
        if (metadata.totalSize > MAX_FILE_SIZE || !gatewayUrl) {
          setIsFilePreview(false)
          setLoading(false)
          return
        }

        // If file is encrypted and no password provided, don't fetch
        if (metadata.uploadOptions?.encryption && !password && !isDecrypted) {
          setIsFilePreview(false)
          setLoading(false)
          return
        }

        setIsFilePreview(true)
        setLoading(true)
        setError(null)
        setDecryptionError(null)

        try {
          const response = await fetch(gatewayUrl)
          if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`)
          }

          let blob = await response.blob()

          // Handle decryption if needed
          if (metadata.uploadOptions?.encryption && password) {
            try {
              console.log('Decrypting file with password:', password)

              // Convert blob to buffer for decryption
              const encryptedBuffer = Buffer.from(await blob.arrayBuffer())

              // Create async iterable from buffer
              const encryptedIterable = (async function* () {
                yield encryptedBuffer
              })()

              // Decrypt the file
              const decryptedChunks: Buffer[] = []
              for await (const chunk of decryptFile(encryptedIterable, password, {
                algorithm: metadata.uploadOptions.encryption.algorithm,
              })) {
                decryptedChunks.push(chunk)
              }

              // Convert decrypted chunks back to blob
              const decryptedBuffer = Buffer.concat(decryptedChunks)
              const mimeType =
                metadata.type === 'file' && 'mimeType' in metadata
                  ? (metadata.mimeType as string)
                  : 'application/octet-stream'
              blob = new Blob([decryptedBuffer], { type: mimeType })

              console.log('Decrypted blob:', blob)
              console.log('Decrypted blob type:', blob.type)
              console.log('Decrypted blob size:', blob.size)
              setIsDecrypted(true)
            } catch (decryptError) {
              console.error('Decryption failed:', decryptError)
              setDecryptionError('Invalid password or decryption failed')
              setLoading(false)
              return
            }
          }

          setFile(blob)

          console.log('blob file', blob)

          // For text-based files, also read the content
          const extension = metadata.name?.split('.').pop()?.toLowerCase() || ''
          const mimeType =
            'mimeType' in metadata ? (metadata.mimeType as string)?.toLowerCase() || '' : ''

          if (
            mimeType.startsWith('text/') ||
            [
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
              'json',
              'md',
              'txt',
              'csv',
              'xml',
            ].includes(extension)
          ) {
            try {
              const text = await blob.text()
              setTextContent(text)
            } catch (err) {
              console.error('Failed to read text from blob:', err)
            }
          }
          setLoading(false)
        } catch (error) {
          console.error('Error fetching file:', error)
          setError(error instanceof Error ? error.message : 'Failed to fetch file')
          setLoading(false)
        }
      },
      [metadata, gatewayUrl, isDecrypted],
    )

    useEffect(() => {
      fetchFile()
    }, [])

    console.log('file', file)

    return (
      <FilePreview
        metadata={metadata}
        isAstral={true}
        network={NetworkId.TAURUS}
        isFilePreview={isFilePreview}
        loading={loading}
        error={error}
        isDecrypted={isDecrypted}
        decryptionError={decryptionError}
        textContent={textContent}
        file={file}
        handleDecrypt={fetchFile}
        gatewayUrl={gatewayUrl}
      />
    )
  },
}

export const Encrypted: Story = {
  render: () => {
    const [isFilePreview, setIsFilePreview] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isDecrypted, setIsDecrypted] = useState(false)
    const [decryptionError, setDecryptionError] = useState<string | null>(null)
    const [file, setFile] = useState<Blob | null>(null)
    const [textContent, setTextContent] = useState<string | null>(null)
    const [fileUrl, setFileUrl] = useState<string | null>(null)
    const [cleanupFn, setCleanupFn] = useState<(() => void) | null>(null)

    const metadata: OffchainMetadata = {
      name: 'Faucet.png',
      type: 'file',
      chunks: [
        {
          cid: 'bafkr6if32l2km23r3kxvvt7oo3q2h657uxv6fwborcv7ldq2w6jldfjzia',
          size: 65066n,
        },
        {
          cid: 'bafkr6ig3gylzdilxbp4oivhptlay3m7pf5e7wmxrv45gqlj7krdrruh464',
          size: 65066n,
        },
        {
          cid: 'bafkr6idwmmfua6hgu62ulym5r7pavogoajhj4blu6nlsc6awm7cnwbmdwe',
          size: 65066n,
        },
        {
          cid: 'bafkr6ibjgkv4lzzneavvbubdhstfamn7cq37j5emf3xlbda2ab7h4mivey',
          size: 65066n,
        },
        {
          cid: 'bafkr6ie6hddrxhtmywwdomzbudtedcyt4oc3zjb4wnmmvrmqys26fgetle',
          size: 65066n,
        },
        {
          cid: 'bafkr6ibv5x5ulwypmlhkagyqzgpssgelvngkk3mpljw4gtju4vacfliozm',
          size: 65066n,
        },
        {
          cid: 'bafkr6iayvmo63begjdcixhqbs4j6wtbe5owwhdqe2dzea6dtzhbsuj6u5a',
          size: 65066n,
        },
        {
          cid: 'bafkr6ihib5thmhqhuwqffwxhofmgmhxapgyxmos2smovtwqkwlttz5xc4i',
          size: 65066n,
        },
        {
          cid: 'bafkr6igddl675m5h73gcrycsaqdtkg3gll754i3webh7xabl3uo3rdb7cy',
          size: 60355n,
        },
      ],
      dataCid: 'bafkr6ifcumi7mbxta6tf4c6cypizevns2gaaakbicjipwio3n6sg4ezliq',
      mimeType: 'image/png',
      totalSize: 580883n,
      totalChunks: 9,
      uploadOptions: {
        encryption: {
          algorithm: EncryptionAlgorithm.AES_256_GCM,
        },
        compression: {
          algorithm: CompressionAlgorithm.ZLIB,
        },
      },
    }

    const gatewayUrl = useMemo(() => {
      if (metadata.dataCid) {
        return EXTERNAL_ROUTES.gatewayObjectDownload(metadata.dataCid)
      }
      return null
    }, [metadata.dataCid])

    const processFileData = useCallback(
      async (fileData: FileData) => {
        // Cleanup previous URL if exists
        if (cleanupFn) {
          cleanupFn()
          setCleanupFn(null)
        }

        const detectedType = await detectFileType(fileData.dataArrayBuffer)
        const type = detectedType === 'unknown' ? 'application/octet-stream' : detectedType

        console.log('Detected file type:', type)
        console.log('File size:', fileData.dataArrayBuffer.byteLength)

        if (type?.startsWith('image/svg')) {
          const url = `data:${type};charset=utf-8,${encodeURIComponent(
            Buffer.from(fileData.dataArrayBuffer).toString('utf-8'),
          )}`
          setFileUrl(url)
          setFile(new Blob([fileData.dataArrayBuffer], { type }))
          setCleanupFn(() => () => {}) // No cleanup needed for data URLs
        } else {
          const blob = new Blob([fileData.dataArrayBuffer], { type })
          const url = URL.createObjectURL(blob)
          setFileUrl(url)
          setFile(blob)
          setCleanupFn(() => () => {
            URL.revokeObjectURL(url)
          })
        }
      },
      [cleanupFn],
    )

    const fetchFile = useCallback(
      async (password?: string) => {
        if (metadata.totalSize > MAX_FILE_SIZE || !gatewayUrl) {
          setIsFilePreview(false)
          setLoading(false)
          return
        }

        // If file is encrypted and no password provided, don't fetch
        if (metadata.uploadOptions?.encryption && !password && !isDecrypted) {
          setIsFilePreview(false)
          setLoading(false)
          return
        }

        setIsFilePreview(true)
        setLoading(true)
        setError(null)
        setDecryptionError(null)

        try {
          const response = await fetch(gatewayUrl)
          if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`)
          }

          const blob = await response.blob()

          console.log('blob', blob)

          // Handle decryption if needed
          if (metadata.uploadOptions?.encryption && password) {
            try {
              console.log('Decrypting file with password:', password)

              // Create FileData object from encrypted blob
              const encryptedFileData: FileData = {
                dataArrayBuffer: await blob.arrayBuffer(),
                fileName: metadata.name,
                isEncrypted: true,
              }

              // Use enhanced decryption function (handles both decryption and decompression)
              const decryptedFileData = await decryptFileData(password, encryptedFileData)

              console.log(
                'Decryption successful, file size:',
                decryptedFileData.dataArrayBuffer.byteLength,
              )

              // Process with enhanced pattern (includes file type detection)
              await processFileData(decryptedFileData)
              setIsDecrypted(true)
              setLoading(false)
              return
            } catch (decryptError) {
              console.error('Decryption failed:', decryptError)
              setDecryptionError('Invalid password or decryption failed')
              setLoading(false)
              return
            }
          }

          setFile(blob)
          console.log('Final blob set to file state:', blob)
          console.log('Final blob type:', blob.type)
          console.log('Final blob size:', blob.size)

          // For text-based files, also read the content
          const extension = metadata.name?.split('.').pop()?.toLowerCase() || ''
          const mimeType =
            'mimeType' in metadata ? (metadata.mimeType as string)?.toLowerCase() || '' : ''

          if (
            mimeType.startsWith('text/') ||
            [
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
              'json',
              'md',
              'txt',
              'csv',
              'xml',
            ].includes(extension)
          ) {
            try {
              const text = await blob.text()
              setTextContent(text)
            } catch (err) {
              console.error('Failed to read text from blob:', err)
            }
          }
          setLoading(false)
        } catch (error) {
          console.error('Error fetching file:', error)
          setError(error instanceof Error ? error.message : 'Failed to fetch file')
          setLoading(false)
        }
      },
      [metadata, gatewayUrl, isDecrypted],
    )

    useEffect(() => {
      fetchFile()
    }, [])

    // Cleanup URL on component unmount
    useEffect(() => {
      return () => {
        if (cleanupFn) {
          cleanupFn()
        }
      }
    }, [cleanupFn])

    console.log('Component render state:', {
      file,
      isFilePreview,
      loading,
      error,
      isDecrypted,
      decryptionError,
      fileType: file?.type,
      fileSize: file?.size,
      fileUrl,
    })

    return (
      <FilePreview
        metadata={metadata}
        isAstral={true}
        network={NetworkId.TAURUS}
        isFilePreview={isFilePreview}
        loading={loading}
        error={error}
        isDecrypted={isDecrypted}
        decryptionError={decryptionError}
        textContent={textContent}
        file={file}
        handleDecrypt={fetchFile}
        gatewayUrl={gatewayUrl}
      />
    )
  },
}
