import { Message, MessageResponse } from '../models/common'

type RpcResponse = MessageResponse | void

export type RpcClientResponder = (message: string) => void

export type RpcCallback = (
  message: Message,
  responder: RpcClientResponder,
) => RpcResponse | undefined

export type RpcHandler = {
  method: string
  handler: RpcCallback
}
