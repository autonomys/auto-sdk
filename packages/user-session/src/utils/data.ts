import { AutoDriveApi } from '@autonomys/auto-drive'
import { Contract } from 'ethers'
import { userIdHash, userSessionCIDFromHash, userSessionCIDHash } from './hash'

export const get = async <T>(
  autoDriveApi: AutoDriveApi,
  contract: Contract,
  userId: string,
): Promise<T | null> => {
  try {
    const userSession = await contract.getUserSession(userIdHash(userId))
    console.log('userSession:', userSession)

    if (!userSession || userSession === '0x') {
      console.log('User session not found')
      return null
    }

    const cid = userSessionCIDFromHash(userSession)
    console.log('cid:', cid)

    console.log(`Downloading file: ${cid}`)
    const stream = await autoDriveApi.downloadFile(cid)

    const chunks: Uint8Array[] = []
    for await (const chunk of stream) {
      chunks.push(chunk)
    }

    const allChunks = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
    let position = 0
    for (const chunk of chunks) {
      allChunks.set(chunk, position)
      position += chunk.length
    }

    const jsonString = new TextDecoder().decode(allChunks)
    const data = JSON.parse(jsonString)
    console.log('data-decoded:', data)

    return data
  } catch (error) {
    console.error('Error finding user by ID:', error)
    return null
  }
}

export const save = async <T>(
  autoDriveApi: AutoDriveApi,
  contract: Contract,
  userId: string,
  data: T,
) => {
  const cid = await autoDriveApi.uploadObjectAsJSON(data, 'explorer-user-session.json')
  console.log('CID:', cid)

  const tx = await contract.setUserSession(userIdHash(userId), userSessionCIDHash(cid))
  console.log('userSession:', tx)

  const txHash = await tx.wait()
  console.log('txHash:', txHash)
}
