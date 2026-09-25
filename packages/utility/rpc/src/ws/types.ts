import http from 'http'
import Websocket from 'websocket'

export type WsServerCallbacks = {
  onConnectionError?: (error: Error) => void
  onClose?: (connection: Websocket.connection, reason: number, description: string) => void
  connectionAcceptance?: (connection: Websocket.request) => void
  onError?: (error: Error) => void
}

export type CreateWsServerParams = {
  httpServer?: http.Server | http.RequestListener
  callbacks?: WsServerCallbacks
  onConnection?: (connection: Websocket.connection) => void
  port?: number
}

export interface WsServer {
  broadcastMessage: (message: Websocket.Message) => void
  onMessage: (cb: WsMessageCallback) => void
  close: () => void
  listen: (port: number, cb?: () => void) => void
  onHttpRequest: (fn: (req: http.IncomingMessage, res: http.ServerResponse) => void) => void
  httpServer: http.Server
}

export type WsMessageCallback = (
  message: Websocket.Message,
  connection: { connection: Websocket.connection },
) => void

export type WsClient = {
  send: (message: Websocket.IMessageEvent['data']) => Promise<void>
  on: (callback: WsMessageResponseCallback) => void
  off: (callback: WsMessageResponseCallback) => void
  close: () => void
}
export type WsMessageResponseCallback = (
  data: Websocket.IMessageEvent['data'],
  responder: (message: Websocket.Message) => void,
) => void
