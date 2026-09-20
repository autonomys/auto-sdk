import http from 'http'
import Websocket from 'websocket'
import { CreateWsServerParams, WsMessageCallback, WsServer } from './types'

const isHttpServer = (s: unknown): s is http.Server =>
  s instanceof http.Server ||
  (typeof s === 'object' &&
    s !== null &&
    'listeners' in s &&
    typeof (s as http.Server).listen === 'function')

export const createWsServer = (params: CreateWsServerParams = {}): WsServer => {
  const {
    httpServer: rawHttpServer,
    callbacks = {},
    onConnection,
    port,
  } = params
  const { onConnectionError, onClose, connectionAcceptance } = callbacks

  const wrapRequestListener = (
    fn: (req: http.IncomingMessage, res: http.ServerResponse) => void,
  ) => {
    return (req: http.IncomingMessage, res: http.ServerResponse) => {
      if (req.method === 'POST' && req.url === '/ws') {
        return
      }
      fn(req, res)
    }
  }

  const defaultFallbackListener: http.RequestListener = (_req, res) => {
    if (!res.headersSent) {
      res.statusCode = 404
      res.end('Not Found')
    }
  }

  let httpServer: http.Server
  if (isHttpServer(rawHttpServer)) {
    httpServer = rawHttpServer
    const listeners = httpServer.listeners('request') as http.RequestListener[]
    listeners.forEach((listener) => {
      httpServer.removeListener('request', listener)
      httpServer.on('request', wrapRequestListener(listener))
    })
  } else if (typeof rawHttpServer === 'function') {
    httpServer = http.createServer(wrapRequestListener(rawHttpServer))
  } else {
    httpServer = http.createServer(wrapRequestListener(defaultFallbackListener))
  }

  const messageCallbacks: WsMessageCallback[] = []

  const ws = new Websocket.server({
    httpServer,
    autoAcceptConnections: false,
  })

  if (onClose) {
    ws.on('close', onClose)
  }

  if (connectionAcceptance) {
    ws.on('request', connectionAcceptance)
  } else {
    ws.on('request', (req: Websocket.request) => {
      req.accept()
    })
  }

  ws.on('connect', (connection) => {
    onConnection?.(connection)

    connection.on('error', (error) => {
      onConnectionError?.(error)
    })

    connection.on('message', (message) => {
      messageCallbacks.forEach((callback) => callback(message, { connection }))
    })
  })

  const onMessage = (callback: WsMessageCallback) => {
    messageCallbacks.push(callback)
  }

  const broadcastMessage = (message: Websocket.Message) => {
    ws.broadcast(message)
  }

  let boundPort: number | null = null
  let isListenPending = false
  let isClosed = false
  const pendingListenCallbacks: Array<() => void> = []

  const close = (): void => {
    isClosed = true
    ws.unmount()
    ws.shutDown()
    ws.closeAllConnections()
    if (httpServer.listening) {
      httpServer.close()
      httpServer.closeAllConnections?.()
    }
  }

  const listen = (listenPort: number, cb?: () => void) => {
    if (isClosed) {
      throw new Error('Cannot listen on a closed server')
    }

    if (httpServer.listening) {
      if (boundPort !== null && boundPort !== listenPort) {
        throw new Error(`Server is already listening on port ${boundPort}`)
      }
      cb?.()
      return
    }

    if (isListenPending) {
      if (boundPort !== null && boundPort !== listenPort) {
        throw new Error(`Server listen is already pending on port ${boundPort}`)
      }
      if (cb) pendingListenCallbacks.push(cb)
      return
    }

    boundPort = listenPort
    isListenPending = true
    if (cb) pendingListenCallbacks.push(cb)

    httpServer.once('listening', () => {
      isListenPending = false
      const addr = httpServer.address()
      if (typeof addr === 'object' && addr !== null) {
        boundPort = addr.port
      }
      if (isClosed) {
        httpServer.close()
        httpServer.closeAllConnections?.()
        return
      }
      while (pendingListenCallbacks.length > 0) {
        const callback = pendingListenCallbacks.shift()
        callback?.()
      }
    })

    httpServer.listen(listenPort)
  }

  if (typeof port === 'number') {
    listen(port)
  }

  const onHttpRequest = (fn: (req: http.IncomingMessage, res: http.ServerResponse) => void) => {
    httpServer.on('request', (req, res) => {
      if (req.method === 'POST' && req.url === '/ws') {
        fn(req, res)
      }
    })
  }

  return {
    broadcastMessage,
    onMessage,
    close,
    listen,
    onHttpRequest,
    httpServer,
  }
}
