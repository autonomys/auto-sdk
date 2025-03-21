import { createRpcClient } from '../src'
import { createTestServer } from './utils'

describe('Client', () => {
  let server: ReturnType<typeof createTestServer>

  beforeEach(() => {
    server = createTestServer()

    jest.clearAllMocks()
    jest.restoreAllMocks()
  })

  afterEach(() => {
    server.wsServer.closeAllConnections()
    server.wsServer.shutDown()
    server.httpServer.closeAllConnections()
    server.httpServer.close()
  })

  it('should be able to send a message', async () => {
    const ws = createRpcClient({
      endpoint: server.url,
      callbacks: {},
      reconnectInterval: 10_000,
    })

    const message = {
      id: 1,
      jsonrpc: '2.0',
      method: 'test',
      params: [],
    }
    const response = await ws.send(message)

    // Expected response should be echoed back
    expect(response).toEqual(message)

    await new Promise((resolve) => setTimeout(resolve, 100))

    ws.close()

    expect(server.mock).toHaveBeenCalledTimes(1)
  })

  it('should be able to recover from a connection error', async () => {
    const reconnectInterval = 1_000

    const ws = await new Promise<ReturnType<typeof createRpcClient>>(async (resolve) => {
      const ws = createRpcClient({
        endpoint: server.url,
        callbacks: {
          onReconnection: () => {
            resolve(ws)
          },
        },
        reconnectInterval,
      })

      setTimeout(() => {
        server.wsServer.connections.map((c) => c.drop(1000, 'test'))
      }, 20)
    })

    ws.send({
      jsonrpc: '2.0',
      method: 'test',
      params: [],
    })
    await new Promise((resolve) => setTimeout(resolve, 100))

    ws.close()

    expect(server.mock).toHaveBeenCalledTimes(1)
  })

  it('should be able to recover from a connection close', async () => {
    const reconnectInterval = 1_000

    const ws = await new Promise<ReturnType<typeof createRpcClient>>(async (resolve) => {
      const ws = createRpcClient({
        endpoint: server.url,
        callbacks: {
          onReconnection: () => {
            resolve(ws)
          },
        },
        reconnectInterval,
      })

      setTimeout(() => {
        server.wsServer.connections.map((c) => c.close())
      }, 20)
    })

    ws.send({
      jsonrpc: '2.0',
      method: 'test',
      params: [],
    })
    await new Promise((resolve) => setTimeout(resolve, 100))

    ws.close()

    expect(server.mock).toHaveBeenCalledTimes(1)
  })

  it('should send a message and receive a response', async () => {
    const ws = createRpcClient({
      endpoint: server.url,
      callbacks: {
        onOpen: () => {
          ws.send({
            jsonrpc: '2.0',
            method: 'echo',
            params: ['Hello, World!'],
          })
        },
      },
    })

    ws.on((message) => {
      expect(message).toEqual({
        jsonrpc: '2.0',
        method: 'echo',
        params: ['Hello, World!'],
        id: expect.any(Number),
      })
    })

    await new Promise((resolve) => setTimeout(resolve, 100))
    ws.close()
  })

  it('should handle errors gracefully', async () => {
    const ws = createRpcClient({
      endpoint: server.url,
      callbacks: {
        onError: (error) => {
          expect(error).toBeInstanceOf(Error)
          expect(error.message).toBe('Test error')
        },
      },
    })

    // Simulate an error
    server.wsServer.connections.forEach((connection) => {
      connection.emit('error', new Error('Test error'))
    })

    await new Promise((resolve) => setTimeout(resolve, 100))
    ws.close()
  })

  it('should be able to close connection', async () => {
    const ws = createRpcClient({
      endpoint: server.url,
      callbacks: {},
      reconnectInterval: 10_000,
    })

    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(server.wsServer.connections).toHaveLength(1)

    ws.close()
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(server.wsServer.connections).toHaveLength(0)
  })
})
