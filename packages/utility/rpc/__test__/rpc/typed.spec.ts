/* eslint-disable camelcase */
import http from 'http'
import { connection } from 'websocket'
import { z } from 'zod'
import { createWsClient, createWsServer, defineUnvalidatedType } from '../../src'
import { createApiDefinition } from '../../src/rpc/api/definition'
import { RpcError } from '../../src/rpc/utils'
import { createBaseHttpServer, TEST_PORT } from '../utils'

describe('rpc/definition', () => {
  let httpServer: http.Server
  let connection: connection

  const { createClient, createServer } = createApiDefinition({
    methods: {
      test: {
        params: z.object({ name: z.string() }),
        returns: z.object({ name: z.string() }),
      },
      internal_error: {
        params: z.object({ name: z.string() }),
        returns: z.object({ name: z.string() }),
      },
      rpc_error: {
        params: z.void(),
        returns: z.void(),
      },
      test_notification_client: {
        params: defineUnvalidatedType<void>(),
        returns: defineUnvalidatedType<void>(),
      },
    },
    notifications: {
      test: {
        content: z.object({ name: z.string() }),
      },
    },
  })
  let client: ReturnType<typeof createClient>
  let server: ReturnType<typeof createServer>

  beforeAll(async () => {
    httpServer = await createBaseHttpServer()

    server = createServer(
      {
        test: (params, { connection: _connection }) => {
          // Workaround to get the connection object
          // for the notification test
          connection = _connection
          return {
            name: params.name,
          }
        },
        internal_error: (params) => {
          throw new Error(params.name)
        },
        rpc_error: () => {
          throw new RpcError('Custom error', RpcError.Code.Custom)
        },
        test_notification_client: (_, { notificationClient }) => {
          notificationClient.test(connection, { name: 'test' })
        },
      },
      {
        server: createWsServer({
          httpServer,
          callbacks: {},
        }),
      },
    )

    client = createClient({
      endpoint: `ws://localhost:${TEST_PORT}`,
      callbacks: {},
    })
  })

  afterAll(() => {
    httpServer.close()
    client.close()
    server.close()
  })

  it('should create a client and server', async () => {
    const result = await client.api.test({ name: 'test' })
    expect(result).toEqual({ name: 'test' })

    await new Promise((resolve) => setTimeout(resolve, 100))
  })

  it('should handle invalid params', async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      await client.api.test({ name: 1 })
    } catch (error) {
      if (error instanceof RpcError) {
        expect(error.code).toEqual(RpcError.Code.InvalidParams)
      } else {
        throw error
      }
    }
  })

  it('should handle internal errors', async () => {
    try {
      await client.api.internal_error({ name: 'test' })
    } catch (error) {
      if (error instanceof RpcError) {
        expect(error.message).toEqual('test')
        expect(error.code).toEqual(RpcError.Code.InternalError)
      } else {
        throw error
      }
    }
  })

  it('should handle rpc errors', async () => {
    try {
      await client.api.rpc_error()
    } catch (error) {
      expect(error).toBeInstanceOf(RpcError)
      if (error instanceof RpcError) {
        expect(error.code).toEqual(RpcError.Code.Custom)
        expect(error.message).toEqual('Custom error')
      }
    }
  })

  it('should send error response if message id is not provided', async () => {
    const client = createWsClient({
      endpoint: `ws://localhost:${TEST_PORT}`,
      callbacks: {
        onEveryOpen: async () => {
          await client.send(
            JSON.stringify({
              jsonrpc: '2.0',
              method: 'test',
              params: { name: 'test' },
            }),
          )
        },
      },
    })
    const mock = jest.fn()
    client.on((message) => {
      mock(message)
    })

    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(JSON.parse(mock.mock.calls[0][0])).toEqual({
      jsonrpc: '2.0',
      error: { code: RpcError.Code.InvalidRequest, message: 'Message ID is required' },
    })

    client.close()
  })

  it('should send notifications and receive them', async () => {
    const mock = jest.fn()

    client.onNotification('test', (params) => {
      mock(params.name)
    })

    server.notificationClient.test(connection, { name: 'test' })

    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(mock.mock.calls[0][0]).toEqual('test')
  })

  it('server should be able to send notifications using the notification service injected into the handler', async () => {
    const mock = jest.fn()

    client.onNotification('test', (params) => {
      mock(params.name)
    })

    await client.api.test_notification_client()

    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(mock.mock.calls[0][0]).toEqual('test')
  })
})
