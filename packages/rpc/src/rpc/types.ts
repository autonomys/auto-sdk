import { Message } from '../models/common'

type RpcResponse = object | void

export type RpcClientResponder = (message: string) => void

export type RpcCallback = (message: Message, responder: RpcClientResponder) => RpcResponse

export type RpcHandler = {
  method: string
  handler: RpcCallback
}
