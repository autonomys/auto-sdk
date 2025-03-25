import { connection } from 'websocket'
import { Message, MessageResponseQuery } from '../models/common'

type RpcResponse = MessageResponseQuery | void | Promise<MessageResponseQuery | void>

export type RpcClientResponder = (message: MessageResponseQuery) => void

export type ClientRPCListener = (message: Message) => void

export type RpcCallback = (
  message: Message,
  params: { connection: connection; messageId?: number },
) => RpcResponse | undefined

export type RpcHandler = {
  method: string
  handler: RpcCallback
}
