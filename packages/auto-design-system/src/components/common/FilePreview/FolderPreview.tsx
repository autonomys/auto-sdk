import { OffchainFolderMetadata } from '@autonomys/auto-dag-data'
import { NetworkId } from '@autonomys/auto-utils'
import { useCallback } from 'react'

export const ROUTES = {
  objectDetails: (networkId: NetworkId, cid: string) => `/${networkId}/drive/metadata/${cid}`,
}

export const FolderPreview = ({
  metadata,
  network,
}: {
  metadata: OffchainFolderMetadata
  network: NetworkId
}) => {
  const getPath = useCallback((cid: string) => ROUTES.objectDetails(network, cid), [network])

  return (
    <div className='flex h-full flex-col items-center justify-center gap-4'>
      <div className='text-center text-gray-500'>{metadata.name}</div>
      <ul>
        {metadata.children.map((child) => (
          <a
            className='text-gray-500 hover:text-gray-700'
            href={getPath(child.cid)}
            key={child.cid}
          >
            <li>{`${child.cid} - ${child.name}`}</li>
          </a>
        ))}
      </ul>
    </div>
  )
}
