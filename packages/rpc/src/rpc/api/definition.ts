import Websocket from 'websocket'
import { createRpcClient } from '../client'
import { createRpcServer } from '../server'
import { Message, MessageQuery, RpcParams, TypedRpcNotificationHandler } from '../types'
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
  ): {
    api: Client
    close: () => void
    onNotification: (
      notificationName: keyof S['notifications'],
      handler: (
        params: DefinitionTypeOutput<S['notifications'][keyof S['notifications']]['content']>,
      ) => void,
    ) => void
  } => {
    const client = createRpcClient(clientParams)

    const apiMethods = Object.entries(serverDefinition.methods).map(([method, handler]) => {
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

    const onNotification = <T extends keyof S['notifications']>(
      notificationName: T,
      handler: (params: DefinitionTypeOutput<S['notifications'][T]['content']>) => void,
    ) => {
      client.on((message: Message) => {
        if (message.method === notificationName) {
          handler(message.params)
        }
      })
    }

    return {
      api: Object.fromEntries(apiMethods) as Client,
      close: client.close,
      onNotification,
    }
  }

  const createServer = <Handlers extends ApiServerHandlers<S>>(
    handlers: Handlers,
    serverParams: Parameters<typeof createRpcServer>[0],
  ) => {
    const server = createRpcServer(serverParams)

    const notificationClient = Object.fromEntries(
      Object.entries(serverDefinition.notifications).map(([notificationName, handler]) => {
        return [
          notificationName,
          ((
            connection: Websocket.connection,
            params: Parameters<DefinitionTypeOutput<typeof handler.content>>[0],
          ) => {
            sendMessage(connection, {
              jsonrpc: '2.0',
              method: notificationName,
              params,
            })
          }) as TypedRpcNotificationHandler<DefinitionTypeOutput<typeof handler.content>>,
        ]
      }),
    )

    for (const [method, internalHandler] of Object.entries(handlers)) {
      const handler = async (
        params: Parameters<Handlers[keyof Handlers]>[0],
        rpcParams: RpcParams,
      ) => {
        if (!rpcParams.messageId) {
          throw new RpcError('Message ID is required', RpcError.Code.InvalidRequest)
        }

        if (isZodType(serverDefinition.methods[method].params)) {
          const result = serverDefinition.methods[method].params.safeParse(params)
          if (!result.success) {
            throw new RpcError(result.error.message, RpcError.Code.InvalidParams)
          }
        }

        // Inject the notification client into the handler
        const result = await internalHandler(params, { ...rpcParams, notificationClient })

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

    const sendMessage = (connection: Websocket.connection, message: MessageQuery) => {
      connection.send(JSON.stringify(message))
    }

    return {
      ...server,
      notificationClient,
    }
  }

  return { createClient, createServer }
}
