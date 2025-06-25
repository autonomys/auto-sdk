import { OffchainMetadata } from '@autonomys/auto-dag-data'
import { NetworkId } from '@autonomys/auto-utils'
import {
  ArrowTopRightOnSquareIcon,
  CodeBracketIcon,
  DocumentIcon,
  DocumentTextIcon,
  LockClosedIcon,
  MusicalNoteIcon,
} from '@heroicons/react/24/outline'
import React, { useCallback, useMemo, useState } from 'react'
import { cn } from '../../../utils/cn'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../astral/Modal/Modal'
import { Arguments } from './Arguments'
import { FolderPreview } from './FolderPreview'
import { NoPreviewAvailable } from './NoPreviewAvailable'

const ImageViewer = ({ src, alt }: { src: string; alt?: string }) => {
  return (
    <div className='relative flex flex-col items-center'>
      <img
        src={src}
        alt={alt || 'Image preview'}
        className={cn(
          'max-h-[50vh] w-auto object-contain dark:border dark:border-gray-700 dark:bg-gray-900',
        )}
      />
    </div>
  )
}

const VideoPlayer = ({ src, type }: { src: string; type?: string }) => {
  return (
    <div className='flex justify-center'>
      <video
        className='max-h-[50vh] max-w-full dark:border dark:border-gray-700'
        controls
        autoPlay={false}
      >
        <source src={src} type={type} />
        <track kind='captions' src='' label='English' />
        Your browser does not support the video tag.
      </video>
    </div>
  )
}

const AudioPlayer = ({ src }: { src: string }) => {
  return (
    <div className='flex flex-col items-center justify-center rounded-lg bg-gray-100 p-6 dark:bg-gray-800'>
      <MusicalNoteIcon className='mb-4 h-16 w-16 text-gray-400 dark:text-gray-500' />
      <audio className='w-full' controls>
        <source src={src} />
        <track kind='captions' src='' label='English' />
        Your browser does not support the audio element.
      </audio>
    </div>
  )
}

const TextViewer = ({ content, extension }: { content: string; extension: string }) => {
  const isCode = [
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
  ].includes(extension)

  return (
    <div className='relative overflow-hidden rounded-md'>
      <div className='absolute right-2 top-2 z-10'>
        {isCode ? (
          <CodeBracketIcon className='h-5 w-5 text-gray-500 dark:text-gray-400' />
        ) : (
          <DocumentTextIcon className='h-5 w-5 text-gray-500 dark:text-gray-400' />
        )}
      </div>
      <pre
        className={cn(
          'max-h-[50vh] overflow-auto p-4',
          isCode
            ? 'bg-gray-800 text-gray-100 dark:bg-gray-900'
            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
        )}
      >
        <code>{content}</code>
      </pre>
    </div>
  )
}

const PDFViewer = ({ src }: { src: string }) => {
  return (
    <div className='flex flex-col items-center'>
      <embed
        src={src}
        type='application/pdf'
        className='h-[50vh] w-full dark:border dark:border-gray-700'
      />
      <a
        href={src}
        target='_blank'
        rel='noopener noreferrer'
        className='mt-2 flex items-center text-auto-drive-accent hover:underline dark:text-darkAccent'
      >
        <DocumentIcon className='mr-1 h-4 w-4' />
        Open PDF in new tab
      </a>
    </div>
  )
}

const PasswordModal = ({
  isOpen,
  onClose,
  onConfirm,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: (password: string) => void
}) => {
  const [password, setPassword] = useState('')

  const handleConfirm = useCallback(() => {
    onConfirm(password)
    onClose()
    setPassword('')
  }, [onClose, password, onConfirm])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className='text-lg font-normal text-gray-900 dark:text-white'>
            Enter Decryption Password
          </DialogTitle>
        </DialogHeader>
        <div className='text-center'>
          <input
            id='password'
            type='password'
            placeholder='Enter Password'
            className='w-full rounded border p-2 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-auto-explorer-primaryAccent'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            className='mt-4 rounded-lg text-xs bg-auto-explorer-buttonLightFrom px-4 py-2.5 font-normal leading-4 text-white dark:bg-auto-explorer-buttonDarkFrom'
            onClick={handleConfirm}
          >
            Confirm
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export type FilePreviewProps = {
  metadata: OffchainMetadata
  isAstral?: boolean
  isAutoDrive?: boolean
  network: NetworkId
  loading?: boolean
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
  loading,
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

  const fileData = useMemo(() => {
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

  const preview = useMemo(() => {
    const DirectGatewayLink = () =>
      gatewayUrl && !metadata.uploadOptions?.encryption ? (
        <div className='mt-2 flex justify-end text-sm'>
          <a
            href={gatewayUrl}
            target='_blank'
            rel='noopener noreferrer'
            className={cn(
              'flex items-center hover:underline',
              isAutoDrive && 'text-auto-drive-accent dark:text-auto-drive-accent',
              isAstral && 'text-auto-explorer-primaryAccent dark:text-auto-explorer-primaryAccent',
            )}
          >
            <ArrowTopRightOnSquareIcon className='mr-1 h-4 w-4' />
            View on gateway
          </a>
        </div>
      ) : null

    if (loading) {
      return (
        <div className='flex h-[50vh] items-center justify-center'>
          <div
            className={cn(
              'h-12 w-12 animate-spin rounded-full border-b-2',
              isAutoDrive && 'border-auto-drive-accent dark:border-auto-drive-accent',
              isAstral &&
                'border-auto-explorer-primaryAccent dark:border-auto-explorer-primaryAccent',
            )}
          ></div>
        </div>
      )
    }

    if (error) {
      return (
        <div className='rounded-md border border-red-300 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'>
          Error: {error}
          {gatewayUrl && <DirectGatewayLink />}
        </div>
      )
    }

    if (decryptionError) {
      return (
        <div className='rounded-md border border-red-300 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'>
          Decryption Error: {decryptionError}
          <button
            onClick={() => setModalOpen(true)}
            className={cn(
              'mt-2 rounded-lg px-4 py-2 text-sm font-semibold text-white',
              isAutoDrive &&
                'bg-auto-drive-accent hover:bg-auto-drive-accent/90 dark:bg-auto-drive-accent dark:hover:bg-auto-drive-accent/90',
              isAstral &&
                'bg-auto-explorer-primaryAccent hover:bg-auto-explorer-primaryAccent/90 dark:bg-auto-explorer-primaryAccent dark:hover:bg-auto-explorer-primaryAccent/90',
            )}
          >
            Try Again
          </button>
          {gatewayUrl && <DirectGatewayLink />}
        </div>
      )
    }

    // Handle encrypted files that haven't been decrypted yet
    if (metadata.uploadOptions?.encryption && !isDecrypted) {
      return (
        <div className='flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800'>
          <div className='flex items-center mb-4'>
            <LockClosedIcon className='mr-2 h-6 w-6 text-auto-explorer-primaryAccent' />
            <p className='text-sm font-normal text-gray-900 dark:text-white'>
              No preview due to the file being encrypted.
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className={cn(
              'rounded-lg px-4 py-2.5 text-xs font-semibold text-white',
              isAutoDrive &&
                'bg-auto-drive-accent hover:bg-auto-drive-accent/90 dark:bg-auto-drive-accent dark:hover:bg-auto-drive-accent/90',
              isAstral &&
                'bg-auto-explorer-buttonLightFrom hover:bg-auto-explorer-buttonLightFrom/90 dark:bg-auto-explorer-buttonDarkFrom dark:hover:bg-auto-explorer-buttonDarkFrom/90',
            )}
          >
            Decrypt File
          </button>
          {gatewayUrl && <DirectGatewayLink />}
        </div>
      )
    }

    if (metadata.type === 'folder') {
      return (
        <>
          <FolderPreview metadata={metadata} network={network} />
          <DirectGatewayLink />
        </>
      )
    }
    if (!isFilePreview || !fileData) {
      return (
        <>
          <NoPreviewAvailable />
          {gatewayUrl && <DirectGatewayLink />}
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
          <DirectGatewayLink />
        </>
      )
    }
    if (mimeType === 'application/pdf' || extension === 'pdf') {
      return (
        <>
          <PDFViewer src={fileData.uri} />
          <DirectGatewayLink />
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
          <DirectGatewayLink />
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
          <DirectGatewayLink />
        </>
      )
    }
    if (
      textContent &&
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
          <TextViewer content={textContent} extension={extension} />
          <DirectGatewayLink />
        </>
      )
    }
    if ((mimeType === 'application/json' || extension === 'json') && file) {
      return (
        <>
          <Arguments file={file} />
          <DirectGatewayLink />
        </>
      )
    }
    return (
      <div className='flex flex-col items-center'>
        <object
          className='h-[50vh] w-full border dark:border-gray-700'
          data={fileData.uri}
          type={fileData.fileType}
          aria-label={fileData.fileName}
          title={fileData.fileName}
        />
        <div className='mt-4 text-sm text-gray-500 dark:text-gray-400'>
          {fileData.fileType || extension.toUpperCase()} file preview
        </div>
        <DirectGatewayLink />
      </div>
    )
  }, [
    loading,
    error,
    decryptionError,
    metadata,
    file,
    isFilePreview,
    fileData,
    textContent,
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
