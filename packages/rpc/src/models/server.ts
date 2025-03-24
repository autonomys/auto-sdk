import Websocket from 'websocket'

export interface WsServer {
  broadcastMessage: (message: Websocket.Message) => void
  onMessage: (cb: WsMessageCallback) => void
  close: () => void
}

export type WsMessageCallback = (
  message: Websocket.Message,
  connection: { connection: Websocket.connection },
) => void
