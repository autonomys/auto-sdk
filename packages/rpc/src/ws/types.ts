import Websocket from 'websocket'

export type WsMessageCallback = (
  data: Websocket.IMessageEvent['data'],
  responder: (message: Websocket.Message) => void,
) => void

export type WsClient = {
  send: (message: Websocket.IMessageEvent['data']) => Promise<void>
  on: (callback: WsMessageCallback) => void
  off: (callback: WsMessageCallback) => void
  close: () => void
}
