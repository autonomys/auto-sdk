import Websocket from 'websocket'
import { createWsClient } from '../../src'
import { createTestServer } from '../utils'
describe('Client', () => {
  let server: Awaited<ReturnType<typeof createTestServer>>

  const mockMessage = JSON.stringify({
    jsonrpc: '2.0',
    method: 'test',
    params: [],
  })

  beforeEach(async () => {
    server = await createTestServer()

    jest.clearAllMocks()
    jest.restoreAllMocks()
  })

  afterEach(async () => {
    server.wsServer.closeAllConnections()
    server.wsServer.shutDown()
    server.httpServer.closeAllConnections()
    server.httpServer.close()
    await new Promise((resolve) => server.httpServer.on('close', resolve))
  })

  it('should be able to send a message', async () => {
    const ws = createWsClient({
      endpoint: server.url,
      callbacks: {},
      reconnectInterval: 10_000,
    })

    await ws.send(mockMessage)

    await new Promise((resolve) => setTimeout(resolve, 100))

    ws.close()

    expect(server.mock).toHaveBeenCalledTimes(1)
  })

  it('should be able to recover from a connection error', async () => {
    const reconnectInterval = 500

    const ws = await new Promise<ReturnType<typeof createWsClient>>(async (resolve) => {
      const ws = createWsClient({
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
      }, 100)
    })

    ws.send(mockMessage)
    await new Promise((resolve) => setTimeout(resolve, 100))

    ws.close()

    expect(server.mock).toHaveBeenCalledTimes(1)
  })

  it('should be able to recover from a connection close', async () => {
    const reconnectInterval = 1_000

    const ws = await new Promise<ReturnType<typeof createWsClient>>(async (resolve) => {
      const ws = createWsClient({
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
      }, 100)
    })

    ws.send(mockMessage)
    await new Promise((resolve) => setTimeout(resolve, 100))

    ws.close()

    expect(server.mock).toHaveBeenCalledTimes(1)
  })

  it('should send a message and receive a response', async () => {
    const ws = createWsClient({
      endpoint: server.url,
      callbacks: {
        onOpen: () => {
          ws.send(mockMessage)
        },
      },
    })

    ws.on((message) => {
      expect(message).toEqual(mockMessage)
    })

    await new Promise((resolve) => setTimeout(resolve, 100))
    ws.close()
  })

  it('should handle errors gracefully', async () => {
    const ws = createWsClient({
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
    const ws = createWsClient({
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
