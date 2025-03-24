import { Message } from '../models/common'

export type RpcClientResponder = (message: string) => void

export type RpcCallback = (message: Message, responder: RpcClientResponder) => void

export type RpcHandler = {
  method: string
  handler: RpcCallback
}
