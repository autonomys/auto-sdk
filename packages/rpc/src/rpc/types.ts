import { connection } from 'websocket'
import { Message, MessageResponse, MessageResponseQuery } from '../models/common'

export type RpcResponse = MessageResponseQuery | void | Promise<MessageResponseQuery | void>

export type RpcClientResponder = (message: MessageResponseQuery) => void

export type ClientRPCListener = ((message: Message) => void) | ((message: MessageResponse) => void)

export type RpcCallback<I, O extends RpcResponse> = (
  params: I,
  rpcParams: { connection: connection; messageId?: number },
) => O | undefined

export type RpcHandler<I, O extends RpcResponse> = {
  method: string
  handler: RpcCallback<I, O>
}

export type RpcHandlerList = RpcHandler<any, RpcResponse>[]
