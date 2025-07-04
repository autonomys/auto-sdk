import EventEmitter from 'events'
import Websocket from 'websocket'
import { randomId } from '../../utils'
import { createRpcClient } from '../client'
import { createRpcServer } from '../server'
import { Message, MessageQuery, RpcParams, TypedRpcNotificationHandler } from '../types'
import { RpcError } from '../utils'
import {
  ApiDefinition,
  ApiServerHandlers,
  ApiServerNotificationHandlers,
  DefinitionTypeOutput,
  HttpClientOptions,
  HttpClientType,
  isZodType,
  WsClientType,
} from './typing'

type ApiDefinitionClient<S extends ApiDefinition> = {
  api: WsClientType<S>
  close: () => void
  onNotification: <T extends keyof S['notifications']>(
    notificationName: T,
    handler: (params: DefinitionTypeOutput<S['notifications'][T]['content']>) => void,
  ) => void
}

export const createApiDefinition = <S extends ApiDefinition>(serverDefinition: S) => {
  const createClient = <Client extends WsClientType<S>>(
    clientParams: Parameters<typeof createRpcClient>[0],
  ): ApiDefinitionClient<S> => {
    const client = createRpcClient(clientParams)

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    ) as ApiServerNotificationHandlers<S>

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

  const createHttpClient = <Client extends HttpClientType<S>>(
    baseUrl: string,
    clientOptions?: HttpClientOptions,
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const apiMethods = Object.entries(serverDefinition.methods).map(([method, handler]) => {
      return [
        method,
        async (
          params: Parameters<DefinitionTypeOutput<typeof handler.params>>[0],
          options?: HttpClientOptions,
        ) => {
          const result = await fetch(`${baseUrl}`, {
            method: 'POST',
            body: JSON.stringify({
              jsonrpc: '2.0',
              method,
              params,
              id: randomId(),
            }),
            headers: {
              'Content-Type': 'application/json',
              ...clientOptions?.headers,
              ...options?.headers,
            },
          })

          if (!result.ok) {
            throw new Error(`HTTP error! status: ${result.status} (${result.statusText})`)
          }

          const body = await result.json()

          if (body.error) {
            throw new RpcError(body.error.message, body.error.code)
          }

          if (isZodType(serverDefinition.methods[method].returns)) {
            const result = serverDefinition.methods[method].returns.safeParse(body.result)
            if (!result.success) {
              throw new RpcError(result.error.message, RpcError.Code.InvalidParams)
            }

            return result.data
          } else {
            return body.result
          }
        },
      ]
    })

    return Object.fromEntries(apiMethods) as Client
  }

  const createMockServerClient = <Client extends HttpClientType<S>>(
    handlers: ApiServerHandlers<S>,
  ): ApiDefinitionClient<S> => {
    const eventEmitter = new EventEmitter()

    const notificationClient = Object.fromEntries(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      Object.entries(serverDefinition.notifications).map(([notificationName, handler]) => {
        return [
          notificationName,
          ((
            connection: Websocket.connection,
            params: Parameters<DefinitionTypeOutput<typeof handler.content>>[0],
          ) => {
            eventEmitter.emit(notificationName, params)
          }) as TypedRpcNotificationHandler<DefinitionTypeOutput<typeof handler.content>>,
        ]
      }),
    ) as ApiServerNotificationHandlers<S>

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const apiMethods = Object.entries(serverDefinition.methods).map(([method, handler]) => {
      return [
        method,
        async (params: DefinitionTypeOutput<typeof handler.params>) => {
          const internalHandler = handlers[method]

          const send = () => {
            throw new Error('RPC handler send method not supported in mock server')
          }

          // Inject the notification client into the handler
          const result = await internalHandler(params, { notificationClient, send })

          return result
        },
      ]
    })

    return {
      api: Object.fromEntries(apiMethods) as Client,
      close: () => {},
      onNotification: <T extends keyof S['notifications']>(
        notificationName: T,
        handler: (params: DefinitionTypeOutput<S['notifications'][T]['content']>) => void,
      ) => {
        eventEmitter.on(notificationName as string, handler)
      },
    }
  }

  return { createClient, createServer, createHttpClient, createMockServerClient }
}
