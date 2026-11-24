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

export type StubSocket = {
  readyState: number
  OPEN: number
  onopen: (() => void) | null
  onerror: ((event: unknown) => void) | null
  onmessage: ((event: { data: string }) => void) | null
  onclose: ((event: { code: number; reason: string; wasClean: boolean }) => void) | null
  send: jest.Mock<void, [unknown]>
  close: jest.Mock<void, []>
  open: () => void
  receive: (data: string) => void
  closeFromServer: (code?: number, reason?: string) => void
  failConnection: () => void
}

export const installStubWebSocket = () => {
  const sockets: StubSocket[] = []

  const spy = jest.spyOn(Websocket, 'w3cwebsocket').mockImplementation(() => {
    const socket: StubSocket = {
      readyState: 0,
      OPEN: 1,
      onopen: null,
      onerror: null,
      onmessage: null,
      onclose: null,
      send: jest.fn(() => {
        if (socket.readyState !== 1) {
          throw new Error('cannot call send() while not connected')
        }
      }),
      close: jest.fn(() => {
        if (socket.readyState === 0) {
          socket.failConnection()
        } else if (socket.readyState === 1) {
          socket.readyState = 2
        }
      }),
      open: () => {
        socket.readyState = 1
        socket.onopen?.()
      },
      receive: (data: string) => {
        socket.onmessage?.({ data })
      },
      closeFromServer: (code = 1006, reason = 'closed') => {
        socket.readyState = 3
        socket.onclose?.({ code, reason, wasClean: code === 1000 })
      },
      failConnection: () => {
        socket.readyState = 3
        socket.onerror?.({ type: 'error' })
        socket.onclose?.({ code: 1006, reason: 'connection failed', wasClean: false })
      },
    }
    sockets.push(socket)
    return socket as unknown as Websocket.w3cwebsocket
  })

  return { sockets, spy }
}
