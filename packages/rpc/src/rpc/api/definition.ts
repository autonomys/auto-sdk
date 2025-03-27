import { z } from 'zod'
import { createRpcClient } from '../client'
import { createRpcServer } from '../server'
import { RpcCallback } from '../types'
import { RpcError } from '../utils'

type MethodDefinition = {
  params: z.ZodType
  returns: z.ZodType
}

export const createApiDefinition = <S extends Record<string, MethodDefinition>>(
  serverDefinition: S,
) => {
  const createClient = <
    Client extends Record<
      keyof S,
      (params: S[keyof S]['params']['_output']) => Promise<S[keyof S]['returns']['_output']>
    >,
  >(
    clientParams: Parameters<typeof createRpcClient>[0],
  ): { api: Client; close: () => void } => {
    const client = createRpcClient(clientParams)

    const apiMethods = Object.entries(serverDefinition).map(([method, handler]) => {
      return [
        method,
        async (params: Parameters<(typeof handler.params)['_output']>[0]) => {
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

  const createServer = <
    Handlers extends Record<
      keyof S,
      RpcCallback<S[keyof S]['params']['_output'], S[keyof S]['returns']['_output']>
    >,
  >(
    handlers: Handlers,
    serverParams: Parameters<typeof createRpcServer>[0],
  ) => {
    const server = createRpcServer(serverParams)

    for (const [method, handler] of Object.entries(handlers)) {
      const mappedHandler: typeof handler = async (params, rpcParams) => {
        const result = await handler(params, rpcParams)
        if (result) {
          return {
            jsonrpc: '2.0',
            id: rpcParams.messageId,
            result,
          }
        }
      }
      server.addRpcHandler({
        method,
        handler: mappedHandler,
      })
    }

    return server
  }

  return { createClient, createServer }
}
