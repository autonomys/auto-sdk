import { createRpcClient } from '../client'
import { createRpcServer } from '../server'
import { RpcError } from '../utils'
import {
  ApiClientType,
  ApiDefinition,
  ApiServerHandlers,
  DefinitionTypeOutput,
  isZodType,
} from './typing'

export const createApiDefinition = <S extends ApiDefinition>(serverDefinition: S) => {
  const createClient = <Client extends ApiClientType<S>>(
    clientParams: Parameters<typeof createRpcClient>[0],
  ): { api: Client; close: () => void } => {
    const client = createRpcClient(clientParams)

    const apiMethods = Object.entries(serverDefinition).map(([method, handler]) => {
      return [
        method,
        async (params: Parameters<DefinitionTypeOutput<typeof handler.params>>[0]) => {
          const result = await client.send({
            jsonrpc: '2.0',
            method,
            params,
          })

          if (result.error) {
            throw new RpcError(result.error.message, result.error.code)
          }

          return result.result
        },
      ]
    })

    return {
      api: Object.fromEntries(apiMethods) as Client,
      close: client.close,
    }
  }

  const createServer = <Handlers extends ApiServerHandlers<S>>(
    handlers: Handlers,
    serverParams: Parameters<typeof createRpcServer>[0],
  ) => {
    const server = createRpcServer(serverParams)

    for (const [method, internalHandler] of Object.entries(handlers)) {
      const handler = async (
        params: Parameters<Handlers[keyof Handlers]>[0],
        rpcParams: Parameters<Handlers[keyof Handlers]>[1],
      ) => {
        if (!rpcParams.messageId) {
          throw new RpcError('Message ID is required', RpcError.Code.InvalidRequest)
        }

        if (isZodType(serverDefinition[method].params)) {
          const result = serverDefinition[method].params.safeParse(params)
          if (!result.success) {
            throw new RpcError(result.error.message, RpcError.Code.InvalidParams)
          }
        }

        const result = await internalHandler(params, rpcParams)

        return {
          jsonrpc: '2.0',
          id: rpcParams.messageId,
          result,
        }
      }

      server.addRpcHandler({
        method,
        handler,
      })
    }

    return server
  }

  return { createClient, createServer }
}
