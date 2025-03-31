import Websocket from 'websocket'

export interface WsServer {
  broadcastMessage: (message: Websocket.Message) => void
  onMessage: (cb: WsMessageCallback) => void
  close: () => void
  listen: (port: number, cb?: () => void) => void
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
