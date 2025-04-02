import http from 'http'
import Websocket from 'websocket'

export const TEST_PORT = 1234

export const createTestServer = async () => {
  const mock = jest.fn()
  const httpServer = await createBaseHttpServer()
  const wsServer = new Websocket.server({
    httpServer,
  })
  wsServer.on('request', (request) => {
    request.accept()
  })

  wsServer.on('connect', (connection) => {
    connection.on('message', (message) => {
      mock(message)
      // Echo the message back to the client
      connection.sendUTF(message.type === 'utf8' ? message.utf8Data : message.binaryData)
    })
  })

  const url = `ws://localhost:${TEST_PORT}`

  return {
    httpServer,
    wsServer,
    mock,
    url,
  }
}

export const createBaseHttpServer = async () => {
  const httpServer = http.createServer()
  httpServer.listen(TEST_PORT)
  await new Promise((resolve) => httpServer.once('listening', resolve))
  return httpServer
}
