import { OffchainMetadata } from '@autonomys/auto-dag-data'
import { NetworkId } from '@autonomys/auto-utils'
import type { Meta, StoryObj } from '@storybook/react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { fileMock1, fileMock2 } from '../../../mocks/files.mock'
import { EXTERNAL_ROUTES, MAX_FILE_SIZE } from './constants'
import { FilePreview } from './FilePreview'
import type { FileData } from './types'
import { decryptFileData, detectFileType } from './utils'

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

export const Astral: Story = {
  render: () => {
    const [isFilePreview, setIsFilePreview] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isDecrypted, setIsDecrypted] = useState(false)
    const [decryptionError, setDecryptionError] = useState<string | null>(null)
    const [file, setFile] = useState<Blob | null>(null)
    const [textContent, setTextContent] = useState<string | null>(null)

    const metadata: OffchainMetadata = fileMock1

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

              // Create FileData object from encrypted blob
              const encryptedFileData: FileData = {
                dataArrayBuffer: await blob.arrayBuffer(),
                fileName: metadata.name,
                isEncrypted: true,
              }

              // Use enhanced decryption function (handles both decryption and decompression)
              const decryptedFileData = await decryptFileData(password, encryptedFileData)

              // Convert decrypted data back to blob
              const mimeType =
                metadata.type === 'file' && 'mimeType' in metadata
                  ? (metadata.mimeType as string)
                  : 'application/octet-stream'
              blob = new Blob([decryptedFileData.dataArrayBuffer], { type: mimeType })

              setIsDecrypted(true)
            } catch (decryptError) {
              console.error('Decryption failed:', decryptError)
              setDecryptionError('Invalid password or decryption failed')
              setLoading(false)
              return
            }
          }

          setFile(blob)

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
    const [cleanupFn, setCleanupFn] = useState<(() => void) | null>(null)

    const metadata: OffchainMetadata = fileMock2

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
          setFile(new Blob([fileData.dataArrayBuffer], { type }))
          setCleanupFn(() => () => {}) // No cleanup needed for data URLs
        } else {
          const blob = new Blob([fileData.dataArrayBuffer], { type })
          const url = URL.createObjectURL(blob)
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
