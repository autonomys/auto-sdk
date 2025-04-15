/* eslint-disable @typescript-eslint/no-explicit-any */
import { asyncIterableToBuffer } from '@autonomys/asynchronous'
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
    logger(params, 'userId:', userId)
    const hash = userIdHash(userId)
    logger(params, 'hash:', hash)
    const userSession = await contract.getUserSession(hash)
    logger(params, 'userSession:', userSession)

    if (!userSession || userSession === '0x') {
      logger(params, 'User session not found')
      return null
    }

    const cid = userSessionCIDFromHash(userSession)
    logger(params, 'cid:', cid)

    logger(params, `Downloading file: ${cid}`)
    const stream = await autoDriveApi.downloadFile(cid, params.password)
    const buffer = await asyncIterableToBuffer(stream)
    const jsonString = new TextDecoder().decode(buffer)
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
  const { autoDriveApi, contract, userId, data, waitReceipt } = params

  const options = params.password ? { password: params.password } : undefined
  const cid = await autoDriveApi.uploadObjectAsJSON(data, params.fileName, options)
  logger(params, 'CID:', cid)

  logger(params, 'userId:', userId)
  const hash = userIdHash(userId)
  logger(params, 'hash:', hash)

  const cidHash = userSessionCIDHash(cid)
  logger(params, 'cidHash:', cidHash)

  const tx = await contract.setUserSession(hash, cidHash)
  logger(params, 'userSession:', tx)

  let txHash = tx.hash
  if (waitReceipt) {
    const txReceipt = await tx.wait()
    logger(params, 'txReceipt:', txReceipt)
    txHash = txReceipt.transactionHash
  }

  return {
    cid,
    txHash,
  }
}
