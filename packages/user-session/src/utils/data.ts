import { GetDataParams, GetDataResult, SaveDataParams, SaveDataResult } from '../types'
import { userIdHash, userSessionCIDFromHash, userSessionCIDHash } from './hash'

const logger = (
  params: GetDataParams | SaveDataParams<any>,
  message: any,
  ...optionalParams: any[]
) => {
  if (params.showLogs) console.log(message, ...optionalParams)
}

export const get = async <T>(params: GetDataParams): Promise<GetDataResult<T>> => {
  const { autoDriveApi, contract, userId } = params
  try {
    const userSession = await contract.getUserSession(userIdHash(userId))
    logger(params, 'userSession:', userSession)

    if (!userSession || userSession === '0x') {
      logger(params, 'User session not found')
      return null
    }

    const cid = userSessionCIDFromHash(userSession)
    logger(params, 'cid:', cid)

    logger(params, `Downloading file: ${cid}`)
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
    logger(params, 'data-decoded:', data)

    return {
      cid,
      data,
    }
  } catch (error) {
    logger(params, 'Error finding user by ID:', error)
    return null
  }
}

export const save = async <T>(params: SaveDataParams<T>): Promise<SaveDataResult> => {
  const { autoDriveApi, contract, userId, data } = params

  const options = params.password ? { password: params.password } : undefined
  const cid = await autoDriveApi.uploadObjectAsJSON(data, params.fileName, options)
  logger(params, 'CID:', cid)

  const tx = await contract.setUserSession(userIdHash(userId), userSessionCIDHash(cid))
  logger(params, 'userSession:', tx)

  const txHash = await tx.wait()
  logger(params, 'txHash:', txHash)

  return {
    cid,
    txHash,
  }
}
