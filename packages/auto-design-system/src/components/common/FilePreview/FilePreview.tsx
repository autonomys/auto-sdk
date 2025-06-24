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
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { cn } from '../../../utils/cn'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../astral/Modal/Modal'
import { Arguments } from './Arguments'
import { FolderPreview } from './FolderPreview'
import { NoPreviewAvailable } from './NoPreviewAvailable'

const MAX_FILE_SIZE = BigInt(100 * 1024 * 1024) // 100 MB

export const EXTERNAL_ROUTES = {
  gatewayObjectDownload: (cid: string) => `https://gateway.autonomys.xyz/file/${cid}`,
}

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
          <DialogTitle>Enter Decryption Password</DialogTitle>
        </DialogHeader>
        <div className='text-center'>
          <input
            id='password'
            type='password'
            placeholder='Enter Password'
            className='w-full rounded-lg border p-2 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            className='mt-4 rounded-lg bg-blue-600 px-4 py-2 font-semibold leading-4 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
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
}

export const FilePreview = ({
  metadata,
  isAstral = false,
  isAutoDrive = false,
  network,
}: FilePreviewProps) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFilePreview, setIsFilePreview] = useState(false)
  const [file, setFile] = useState<Blob | null>(null)
  const [textContent, setTextContent] = useState<string | null>(null)
  const [isModalOpen, setModalOpen] = useState(false)
  const [isDecrypted, setIsDecrypted] = useState(false)
  const [decryptionError, setDecryptionError] = useState<string | null>(null)

  const gatewayUrl = useMemo(() => {
    if (metadata.dataCid) {
      return EXTERNAL_ROUTES.gatewayObjectDownload(
        'bafkr6ibthdttmf6jjc5pj5wz64sel5zcztdzbpkntvfs3yir37n4thjgl4',
      )
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

        const blob = await response.blob()

        // Handle decryption if needed
        if (metadata.uploadOptions?.encryption && password) {
          try {
            // Here you would implement the actual decryption logic
            // For now, we'll simulate decryption by just setting the blob
            // In a real implementation, you would decrypt the blob with the password
            console.log('Decrypting file with password:', password)

            // Simulate decryption - replace this with actual decryption logic
            // const decryptedBlob = await decryptFile(blob, password)
            // blob = decryptedBlob

            setIsDecrypted(true)
          } catch (decryptError) {
            console.error('Decryption failed:', decryptError)
            setDecryptionError('Invalid password or decryption failed')
            setLoading(false)
            return
          }
        }

        setFile(blob)

        console.log('blob', blob)

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
  }, [fetchFile])

  const handleDecrypt = useCallback(
    (password: string) => {
      fetchFile(password)
    },
    [fetchFile],
  )

  const fileData = useMemo(() => {
    return (
      file && {
        uri: gatewayUrl || URL.createObjectURL(file), // Prefer the direct gateway URL if available
        fileName: metadata.name,
        fileType:
          metadata.type === 'file' && 'mimeType' in metadata
            ? (metadata.mimeType as string)
            : undefined,
      }
    )
  }, [file, metadata, gatewayUrl])

  const preview = useMemo(() => {
    const DirectGatewayLink = () =>
      gatewayUrl ? (
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
              !isAutoDrive &&
                !isAstral &&
                'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600',
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
            <LockClosedIcon className='mr-2 h-6 w-6 text-purple-500' />
            <p className='text-sm font-medium text-gray-900 dark:text-white md:text-lg'>
              No preview due to the file being encrypted.
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-semibold text-white',
              isAutoDrive &&
                'bg-auto-drive-accent hover:bg-auto-drive-accent/90 dark:bg-auto-drive-accent dark:hover:bg-auto-drive-accent/90',
              isAstral &&
                'bg-auto-explorer-primaryAccent hover:bg-auto-explorer-primaryAccent/90 dark:bg-auto-explorer-primaryAccent dark:hover:bg-auto-explorer-primaryAccent/90',
              !isAutoDrive &&
                !isAstral &&
                'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600',
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
