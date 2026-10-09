import EventEmitter from 'events'
import Websocket from 'websocket'
import { randomId } from '../../utils'
import { createRpcClient } from '../client'
import { createRpcServer } from '../server'
import {
  Message,
  MessageQuery,
  RpcClientCallbacks,
  RpcParams,
  TypedRpcNotificationHandler,
} from '../types'
import { RpcError } from '../utils'
import { StandardSchemaV1, StandardSchemaV1Issue } from './standardSchema'
import {
  ApiDefinition,
  ApiDefinitionClient,
  ApiMockServerClient,
  ApiServerHandlers,
  ApiServerNotificationHandlers,
  DefinitionTypeOutput,
  HttpClientOptions,
  HttpClientType,
  isStandardSchema,
  TypedRpcServerClient,
  WsClientType,
} from './typing'

// Builds one message from every issue, e.g. "name: Expected string; Expected an object"
const formatIssues = (issues: ReadonlyArray<StandardSchemaV1Issue>) =>
  issues
    .map((issue) => {
      const path = issue.path
        ?.map((segment) => String(typeof segment === 'object' ? segment.key : segment))
        .join('.')
      return path ? `${path}: ${issue.message}` : issue.message
    })
    .join('; ')

// validate() may return a Promise (allowed by the spec), so it's always awaited
const validateSchema = async (schema: StandardSchemaV1, value: unknown) => {
  const result = await schema['~standard'].validate(value)
  if (result.issues) {
    throw new RpcError(formatIssues(result.issues), RpcError.Code.InvalidParams)
  }

  return result.value
}

export const createApiDefinition = <S extends ApiDefinition>(serverDefinition: S) => {
  const createClient = <Client extends WsClientType<S>>(clientParams: {
    endpoint: string
    callbacks: RpcClientCallbacks
    reconnectInterval?: number | null
    debug?: boolean
  }): ApiDefinitionClient<S> => {
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

          if (isStandardSchema(serverDefinition.methods[method].returns)) {
            return validateSchema(serverDefinition.methods[method].returns, result.result)
          } else {
            return result.result
          }
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
    serverParams?: Parameters<typeof createRpcServer>[0],
  ): TypedRpcServerClient<S> => {
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

        if (isStandardSchema(serverDefinition.methods[method].params)) {
          await validateSchema(serverDefinition.methods[method].params, params)
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

  const createHttpClient = (
    baseUrl: string,
    clientOptions?: HttpClientOptions,
  ): HttpClientType<S> => {
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

          if (isStandardSchema(serverDefinition.methods[method].returns)) {
            return validateSchema(serverDefinition.methods[method].returns, body.result)
          } else {
            return body.result
          }
        },
      ]
    })

    return Object.fromEntries(apiMethods) as HttpClientType<S>
  }

  const createMockServerClient = <Client extends HttpClientType<S>>({
    handlers,
    callbacks,
  }: {
    handlers: ApiServerHandlers<S>
    callbacks: RpcClientCallbacks
  }): ApiMockServerClient<S> => {
    const eventEmitter = new EventEmitter()

    setTimeout(() => {
      callbacks?.onEveryOpen?.()
      callbacks?.onFirstOpen?.()
    }, 0)

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

          if (isStandardSchema(serverDefinition.methods[method].returns)) {
            return validateSchema(serverDefinition.methods[method].returns, result)
          } else {
            return result
          }
        },
      ]
    })

    return {
      api: Object.fromEntries(apiMethods) as Client,
      close: () => {
        eventEmitter.removeAllListeners()
      },
      onNotification: <T extends keyof S['notifications']>(
        notificationName: T,
        handler: (params: DefinitionTypeOutput<S['notifications'][T]['content']>) => void,
      ) => {
        eventEmitter.on(notificationName as string, handler)
      },
      notificationClient,
    }
  }

  return { createClient, createServer, createHttpClient, createMockServerClient }
}
