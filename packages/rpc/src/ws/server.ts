import http from 'http'
import Websocket from 'websocket'
import { WsMessageCallback, WsServer } from '../models/server'

export const createWsServer = ({
  httpServer,
  callbacks: { onConnectionError, onClose, connectionAcceptance },
  onConnection,
}: {
  httpServer: http.Server
  callbacks: {
    onConnectionError?: (error: Error) => void
    onClose?: (connection: Websocket.connection, reason: number, description: string) => void
    connectionAcceptance?: (connection: Websocket.request) => void
  }
  onConnection?: (connection: Websocket.connection) => void
}): WsServer => {
  const messageCallbacks: WsMessageCallback[] = []

  const ws = new Websocket.server({
    httpServer: http.createServer(httpServer),
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

  ws.mount({ httpServer })

  const shutDown = () => {
    ws.unmount()
    ws.shutDown()
    ws.closeAllConnections()

    httpServer.close()
    httpServer.closeAllConnections()
  }

  return {
    broadcastMessage,
    onMessage,
    shutDown,
  }
}
