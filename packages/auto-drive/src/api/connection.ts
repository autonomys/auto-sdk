import { createApiRequestHandler } from './handler'
import { AutoDriveApi, ConnectionOptions } from './type'
import { createApiInterface } from './wrappers'

export const createAutoDriveApi = (options: ConnectionOptions): AutoDriveApi => {
  const apiHandler = createApiRequestHandler(options)
  return createApiInterface(apiHandler)
}
