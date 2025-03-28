import http from 'http'
import { z } from 'zod'
import { createRpcClient, createWsClient, createWsServer } from '../../src'
import { createApiDefinition } from '../../src/rpc/api/definition'
import { RpcError } from '../../src/rpc/utils'
import { createBaseHttpServer, TEST_PORT } from '../utils'

describe('rpc/definition', () => {
  let httpServer: http.Server
  const { createClient, createServer } = createApiDefinition({
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
  })
  let client: ReturnType<typeof createClient>
  let server: ReturnType<typeof createServer>

  beforeAll(async () => {
    httpServer = await createBaseHttpServer()

    server = createServer(
      {
        test: (params) => {
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
        onOpen: async () => {
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
})
