import { OffchainMetadata } from '@autonomys/auto-dag-data'
import { NetworkId } from '@autonomys/auto-utils'
import React, { useMemo, useState } from 'react'
import { sanitizeHTML } from '../../../utils/sanitizeHTML'
import { Arguments } from './Arguments'
import { AudioPlayer } from './AudioPlayer'
import { DecryptionErrorDisplay } from './DecryptionErrorDisplay'
import { DirectGatewayLink } from './DirectGatewayLink'
import { EncryptedFilePrompt } from './EncryptedFilePrompt'
import { ErrorDisplay } from './ErrorDisplay'
import { FolderPreview } from './FolderPreview'
import { ImageViewer } from './ImageViewer'
import { LoadingSpinner } from './LoadingSpinner'
import { NoPreviewAvailable } from './NoPreviewAvailable'
import { PasswordModal } from './PasswordModal'
import { PDFViewer } from './PDFViewer'
import { TextViewer } from './TextViewer'
import { VideoPlayer } from './VideoPlayer'

export type FilePreviewProps = {
  metadata: OffchainMetadata
  isAstral?: boolean
  isAutoDrive?: boolean
  network: NetworkId
  loading: boolean
  file: Blob | null
  error: string | null
  isDecrypted?: boolean
  decryptionError: string | null
  textContent: string | null
  gatewayUrl: string | null
  isFilePreview?: boolean
  handleDecrypt: (password: string) => void
}

export const FilePreview = ({
  metadata,
  isAstral = false,
  isAutoDrive = false,
  network,
  loading = false,
  file,
  error,
  isDecrypted,
  decryptionError,
  textContent,
  gatewayUrl,
  isFilePreview,
  handleDecrypt,
}: FilePreviewProps) => {
  const [isModalOpen, setModalOpen] = useState(false)
  const sanitizedTextContent = useMemo(() => {
    return textContent ? sanitizeHTML(textContent) : null
  }, [textContent])

  const fileData = useMemo(() => {
    // For non-encrypted files that can be displayed directly, use gateway URL even without file blob
    if (!file && !metadata.uploadOptions?.encryption && gatewayUrl) {
      const data = {
        uri: gatewayUrl,
        fileName: metadata.name,
        fileType:
          metadata.type === 'file' && 'mimeType' in metadata ? metadata.mimeType : undefined,
      }
      return data
    }

    if (!file) return null

    const uri = metadata.uploadOptions?.encryption
      ? URL.createObjectURL(file) // For encrypted files, always use the blob URL (decrypted content)
      : gatewayUrl || URL.createObjectURL(file) // For non-encrypted files, prefer gateway URL

    const data = {
      uri,
      fileName: metadata.name,
      fileType: metadata.type === 'file' && 'mimeType' in metadata ? metadata.mimeType : undefined,
    }

    return data
  }, [file, metadata, gatewayUrl])

  const renderErrorStates = () => {
    if (loading) {
      return <LoadingSpinner isAutoDrive={isAutoDrive} isAstral={isAstral} />
    }

    if (error) {
      return (
        <ErrorDisplay
          error={error}
          gatewayUrl={gatewayUrl}
          isAutoDrive={isAutoDrive}
          isAstral={isAstral}
        />
      )
    }

    if (decryptionError) {
      return (
        <DecryptionErrorDisplay
          decryptionError={decryptionError}
          gatewayUrl={gatewayUrl}
          isAutoDrive={isAutoDrive}
          isAstral={isAstral}
          onRetry={() => setModalOpen(true)}
        />
      )
    }

    // Handle encrypted files that haven't been decrypted yet
    if (metadata.uploadOptions?.encryption && !isDecrypted) {
      return (
        <EncryptedFilePrompt
          isAutoDrive={isAutoDrive}
          isAstral={isAstral}
          onDecryptClick={() => setModalOpen(true)}
        />
      )
    }

    return null
  }

  const renderFileContent = () => {
    if (metadata.type === 'folder') {
      return (
        <>
          <FolderPreview metadata={metadata} network={network} />
          <DirectGatewayLink
            gatewayUrl={gatewayUrl}
            isEncrypted={!!metadata.uploadOptions?.encryption}
            isAutoDrive={isAutoDrive}
            isAstral={isAstral}
          />
        </>
      )
    }
    if (!isFilePreview || !fileData) {
      return (
        <>
          <NoPreviewAvailable />
          <DirectGatewayLink
            gatewayUrl={gatewayUrl}
            isEncrypted={!!metadata.uploadOptions?.encryption}
            isAutoDrive={isAutoDrive}
            isAstral={isAstral}
          />
        </>
      )
    }
    // Get file extension from name
    const extension = metadata.name?.split('.').pop()?.toLowerCase() || ''
    const mimeType =
      'mimeType' in metadata ? (metadata.mimeType as string)?.toLowerCase() || '' : ''

    if (
      mimeType.startsWith('image/') ||
      ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(extension)
    ) {
      return (
        <>
          <ImageViewer src={fileData.uri} alt={fileData.fileName} />
          <DirectGatewayLink
            gatewayUrl={gatewayUrl}
            isEncrypted={!!metadata.uploadOptions?.encryption}
            isAutoDrive={isAutoDrive}
            isAstral={isAstral}
          />
        </>
      )
    }
    if (mimeType === 'application/pdf' || extension === 'pdf') {
      return (
        <>
          <PDFViewer src={fileData.uri} />
          <DirectGatewayLink
            gatewayUrl={gatewayUrl}
            isEncrypted={!!metadata.uploadOptions?.encryption}
            isAutoDrive={isAutoDrive}
            isAstral={isAstral}
          />
        </>
      )
    }
    if (
      mimeType.startsWith('video/') ||
      ['mp4', 'webm', 'avi', 'mov', 'mkv', 'flv', 'wmv'].includes(extension)
    ) {
      return (
        <>
          <VideoPlayer src={fileData.uri} type={fileData.fileType} />
          <DirectGatewayLink
            gatewayUrl={gatewayUrl}
            isEncrypted={!!metadata.uploadOptions?.encryption}
            isAutoDrive={isAutoDrive}
            isAstral={isAstral}
          />
        </>
      )
    }
    if (
      mimeType.startsWith('audio/') ||
      ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'].includes(extension)
    ) {
      return (
        <>
          <AudioPlayer src={fileData.uri} />
          <DirectGatewayLink
            gatewayUrl={gatewayUrl}
            isEncrypted={!!metadata.uploadOptions?.encryption}
            isAutoDrive={isAutoDrive}
            isAstral={isAstral}
          />
        </>
      )
    }
    if (
      sanitizedTextContent &&
      (mimeType.startsWith('text/') ||
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
          'txt',
          'md',
          'xml',
          'csv',
        ].includes(extension))
    ) {
      return (
        <>
          <TextViewer content={sanitizedTextContent} extension={extension} />
          <DirectGatewayLink
            gatewayUrl={gatewayUrl}
            isEncrypted={!!metadata.uploadOptions?.encryption}
            isAutoDrive={isAutoDrive}
            isAstral={isAstral}
          />
        </>
      )
    }
    if ((mimeType === 'application/json' || extension === 'json') && file) {
      return (
        <>
          <Arguments file={file} />
          <DirectGatewayLink
            gatewayUrl={gatewayUrl}
            isEncrypted={!!metadata.uploadOptions?.encryption}
            isAutoDrive={isAutoDrive}
            isAstral={isAstral}
          />
        </>
      )
    }

    const sanitizedFileName = useMemo(() => {
      return fileData.fileName ? sanitizeHTML(fileData.fileName) : undefined
    }, [fileData.fileName])

    return (
      <div className='flex flex-col items-center'>
        <object
          className='h-[50vh] w-full border dark:border-gray-700'
          data={fileData.uri}
          type={fileData.fileType}
          aria-label={sanitizedFileName}
          title={sanitizedFileName}
        />
        <div className='mt-4 text-sm text-gray-500 dark:text-gray-400'>
          {fileData.fileType || extension.toUpperCase()} file preview
        </div>
        <DirectGatewayLink
          gatewayUrl={gatewayUrl}
          isEncrypted={!!metadata.uploadOptions?.encryption}
          isAutoDrive={isAutoDrive}
          isAstral={isAstral}
        />
      </div>
    )
  }

  const preview = useMemo(() => {
    const errorState = renderErrorStates()
    if (errorState) return errorState

    return renderFileContent()
  }, [
    loading,
    error,
    decryptionError,
    metadata,
    file,
    isFilePreview,
    fileData,
    sanitizedTextContent,
    gatewayUrl,
    isDecrypted,
  ])

  return (
    <>
      {preview}
      <PasswordModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleDecrypt}
      />
    </>
  )
}
