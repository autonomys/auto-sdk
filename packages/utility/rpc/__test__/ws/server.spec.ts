import http from 'http'
import { createWsClient, WsClient } from '../../src'
import { encodeMessageData } from '../../src/utils/websocket'
import { createWsServer } from '../../src/ws/server'
import { createBaseHttpServer, TEST_PORT } from '../utils'

describe('Server', () => {
  let baseHttpServer: http.Server

  beforeEach(async () => {
    baseHttpServer = await createBaseHttpServer()

    jest.clearAllMocks()
    jest.restoreAllMocks()
  })

  it('should be able to establish a connection w/o any error or close message', async () => {
    const mock = jest.fn()
    const server = createWsServer({
      httpServer: baseHttpServer,
      callbacks: {
        onConnectionError: mock,
        onClose: mock,
      },
    })

    const client = createWsClient({
      endpoint: `ws://localhost:${TEST_PORT}`,
      callbacks: {
        onClose: mock,
        onError: mock,
      },
    })

    await new Promise((resolve) => setTimeout(resolve, 3_000))

    expect(mock).toHaveBeenCalledTimes(0)

    server.close()
    client.close()
  })

  it('should be able to send a message', async () => {
    const server = createWsServer({
      httpServer: baseHttpServer,
      callbacks: {},
    })

    const messageReceived = jest.fn()
    server.onMessage((message) => {
      messageReceived(message)
    })

    const client = await new Promise<WsClient>((resolve) => {
      const client = createWsClient({
        endpoint: `ws://localhost:${TEST_PORT}`,
        callbacks: {
          onEveryOpen: async () => {
            resolve(client)
            client.send(encodeMessageData('test'))
          },
        },
      })
    })

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(messageReceived).toHaveBeenCalledTimes(1)

    server.close()
    client.close()
  })
})
