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

    const ws = await new Promise<ReturnType<typeof createWsClient>>((resolve) => {
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

    const onEveryOpen = jest.fn()
    const onFirstOpen = jest.fn()
    const ws = await new Promise<ReturnType<typeof createWsClient>>((resolve) => {
      const ws = createWsClient({
        endpoint: server.url,
        callbacks: {
          onReconnection: () => {
            resolve(ws)
          },
          onEveryOpen: () => {
            onEveryOpen(ws)
          },
          onFirstOpen: () => {
            onFirstOpen(ws)
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
    expect(onEveryOpen).toHaveBeenCalledTimes(2)
    expect(onFirstOpen).toHaveBeenCalledTimes(1)
  })

  it('should send a message and receive a response', async () => {
    const ws = createWsClient({
      endpoint: server.url,
      callbacks: {
        onEveryOpen: () => {
          ws.send(mockMessage)
        },
      },
    })

    const receivedMessages: unknown[] = []
    ws.on((message) => {
      receivedMessages.push(message)
    })

    await new Promise((resolve) => setTimeout(resolve, 100))
    ws.close()

    expect(receivedMessages).toEqual([mockMessage])
  })

  it('should handle errors gracefully', async () => {
    // Replace the test server's auto-accept so the client's handshake fails
    server.wsServer.removeAllListeners('request')
    server.wsServer.on('request', (request) => {
      request.reject()
    })

    const errors: unknown[] = []
    const ws = createWsClient({
      endpoint: server.url,
      callbacks: {
        onError: (error) => {
          errors.push(error)
        },
      },
      reconnectInterval: null,
    })

    await new Promise((resolve) => setTimeout(resolve, 100))
    ws.close()

    expect(errors).toHaveLength(1)
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
