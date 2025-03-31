import { GetDataParams, GetDataResult, SaveDataParams, SaveDataResult } from '../types'
import { userIdHash, userSessionCIDFromHash, userSessionCIDHash } from './hash'

export const get = async <T>(params: GetDataParams): Promise<GetDataResult<T>> => {
  const { autoDriveApi, contract, userId } = params
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
    const stream = await autoDriveApi.downloadFile(cid, params.password)

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

    return {
      cid,
      data,
    }
  } catch (error) {
    console.error('Error finding user by ID:', error)
    return null
  }
}

export const save = async <T>(params: SaveDataParams<T>): Promise<SaveDataResult> => {
  const { autoDriveApi, contract, userId, data } = params

  const options = params.password ? { password: params.password } : undefined
  const cid = await autoDriveApi.uploadObjectAsJSON(data, params.fileName, options)
  console.log('CID:', cid)

  const tx = await contract.setUserSession(userIdHash(userId), userSessionCIDHash(cid))
  console.log('userSession:', tx)

  const txHash = await tx.wait()
  console.log('txHash:', txHash)

  return {
    cid,
    txHash,
  }
}
