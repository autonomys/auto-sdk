import { createRpcClient, createRpcServer, createWsServer } from '../../src'
import { createBaseHttpServer, TEST_PORT } from '../utils'

describe('RPC', () => {
  let rpcServer: ReturnType<typeof createRpcServer>
  let rpcClient: ReturnType<typeof createRpcClient>

  beforeEach(async () => {
    const httpServer = await createBaseHttpServer()
    rpcServer = createRpcServer({
      server: createWsServer({
        httpServer,
        callbacks: {},
      }),
      initialHandlers: [],
    })

    rpcClient = createRpcClient({
      endpoint: `ws://localhost:${TEST_PORT}`,
      callbacks: {},
    })
  })

  afterEach(async () => {
    rpcServer.close()
    rpcClient.close()
  })

  it('should be able to send a message to the server and get a response', async () => {
    const mockRequest = {
      jsonrpc: '2.0',
      method: 'test',
      id: 1,
      params: {},
    }
    const mockResponse = {
      jsonrpc: '2.0',
      result: 'success',
      id: 1,
    }

    rpcServer.addRpcHandler({
      method: 'test',
      handler: (msg, { messageId }) =>
        messageId
          ? {
              jsonrpc: '2.0',
              result: 'success',
              id: msg.id,
            }
          : undefined,
    })

    const response = await rpcClient.send(mockRequest)

    expect(mockResponse).toEqual(response)
  })

  it('should return an error for an invalid method', async () => {
    const message = {
      jsonrpc: '2.0',
      method: 'invalidMethod',
      id: 1,
      params: {},
    }
    const response = await rpcClient.send(message).catch((err) => err)

    expect(response).toHaveProperty('error', { code: 404, message: 'Method not found' })
  })

  it('should handle messages with missing parameters', async () => {
    rpcServer.addRpcHandler({
      method: 'test',
      handler: (_, { messageId }) => {
        return messageId ? { jsonrpc: '2.0', id: messageId, result: 'success' } : undefined
      },
    })

    const message = {
      jsonrpc: '2.0',
      method: 'test',
      id: 2,
      // params is intentionally omitted
    }
    const response = await rpcClient.send(message)

    expect(response).toEqual({ jsonrpc: '2.0', id: 2, result: 'success' })
  })
})
