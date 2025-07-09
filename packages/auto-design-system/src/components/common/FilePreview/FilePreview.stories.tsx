import {
  canDisplayDirectly,
  decryptFileData,
  FileData,
  needsContentParsing,
  OffchainMetadata,
  processFileData,
} from '@autonomys/auto-dag-data'
import { NetworkId } from '@autonomys/auto-utils'
import type { Meta, StoryObj } from '@storybook/react'
import React, { useCallback, useEffect, useState } from 'react'
import { fileMock1, fileMock2 } from '../../../mocks/files.mock'
import { FilePreview } from './FilePreview'
import { EXTERNAL_ROUTES } from './constants'

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
    const gatewayUrl = EXTERNAL_ROUTES.gatewayObjectDownload(metadata.dataCid)

    const fetchFile = useCallback(
      async (password?: string) => {
        // If file is encrypted and no password provided, don't fetch
        if (metadata.uploadOptions?.encryption && !password && !isDecrypted) {
          setIsFilePreview(false)
          setLoading(false)
          return
        }

        // For non-encrypted files that can be displayed directly,
        if (!metadata.uploadOptions?.encryption && canDisplayDirectly(metadata)) {
          setIsFilePreview(true)
          setFile(null)
          setLoading(false)
          return
        }

        // Encrypted files always need to be fetched and decrypted
        setIsFilePreview(true)
        setLoading(true)

        try {
          const response = await fetch(gatewayUrl)
          if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`)
          }
          const blob = await response.blob()
          setFile(blob)
          // For text-based files, also read the content
          if (needsContentParsing(metadata)) {
            const text = await blob.text()
            setTextContent(text)
          }
          // Handle decryption if needed
          if (metadata.uploadOptions?.encryption && password) {
            try {
              const encryptedFileData: FileData = {
                dataArrayBuffer: await blob.arrayBuffer(),
                name: metadata.name ?? '',
                rawData: '',
                uploadOptions: metadata.uploadOptions,
                isEncrypted: true,
              }
              const decryptedFileData = await decryptFileData(password, encryptedFileData)
              const decryptedBlob = await processFileData(decryptedFileData)
              setFile(decryptedBlob)
              setIsDecrypted(true)
              setLoading(false)
              return
            } catch {
              setDecryptionError('Invalid password or decryption failed')
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

    const metadata: OffchainMetadata = fileMock2
    const gatewayUrl = EXTERNAL_ROUTES.gatewayObjectDownload(metadata.dataCid)

    const fetchFile = useCallback(
      async (password?: string) => {
        // If file is encrypted and no password provided, don't fetch
        if (metadata.uploadOptions?.encryption && !password && !isDecrypted) {
          setIsFilePreview(false)
          setLoading(false)
          return
        }

        // For non-encrypted files that can be displayed directly,
        if (!metadata.uploadOptions?.encryption && canDisplayDirectly(metadata)) {
          setIsFilePreview(true)
          setFile(null)
          setLoading(false)
          return
        }

        // Encrypted files always need to be fetched and decrypted
        setIsFilePreview(true)
        setLoading(true)

        try {
          const response = await fetch(gatewayUrl)
          if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`)
          }
          const blob = await response.blob()
          setFile(blob)
          // For text-based files, also read the content
          if (needsContentParsing(metadata)) {
            const text = await blob.text()
            setTextContent(text)
          }
          // Handle decryption if needed
          if (metadata.uploadOptions?.encryption && password) {
            try {
              const encryptedFileData: FileData = {
                dataArrayBuffer: await blob.arrayBuffer(),
                name: metadata.name ?? '',
                uploadOptions: metadata.uploadOptions,
                isEncrypted: true,
              }
              const decryptedFileData = await decryptFileData(password, encryptedFileData)
              const decryptedBlob = await processFileData(decryptedFileData)
              setFile(decryptedBlob)
              setIsDecrypted(true)
              setLoading(false)
              return
            } catch {
              setDecryptionError('Invalid password or decryption failed')
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
