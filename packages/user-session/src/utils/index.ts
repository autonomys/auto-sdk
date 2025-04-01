import { createAutoDriveApi } from '@autonomys/auto-drive'
import type { UsersSessionOptions } from '../types'
import { UserSessionContract } from './contract'
import { get, save } from './data'

export const UserSession = <T>(options: UsersSessionOptions) => {
  const contract = UserSessionContract(options)
  const autoDriveApi = createAutoDriveApi(options)

  const findUserByID = async (userId: string) =>
    await get<T>({
      autoDriveApi,
      contract,
      userId,
      password: options.password,
      showLogs: options.showLogs,
    })

  const saveUser = async (userId: string, user: T) =>
    await save<T>({
      autoDriveApi,
      contract,
      userId,
      data: user,
      fileName: options.fileName,
      password: options.password,
      showLogs: options.showLogs,
    })

  return {
    findUserByID,
    saveUser,
  }
}

export { UserSessionContract }
