import Websocket from 'websocket'
import { Message, Serializable } from './common'

export interface WsServer {
  broadcastMessage: (message: Serializable) => void
  onMessage: (cb: MessageCallback) => void
}

export type MessageCallback = (
  message: Message,
  connection: { connection: Websocket.connection },
) => void

export interface RpcHandler {
  method: string
  handler: (
    params: unknown[],
    connection: { connection: Websocket.connection; messageId: number },
  ) => void
}
