import { connection } from 'websocket'
import { Message, MessageResponse, MessageResponseQuery } from '../models/common'
import { PromiseOr } from '../utils/types'

type SuccessResponse<T> = {
  jsonrpc: string
  id: number
  result: T
}

type ErrorResponse = {
  jsonrpc: string
  id: number
  error: {
    code: number
    message: string
  }
}

export type RpcResponse<T = any> = PromiseOr<SuccessResponse<T> | ErrorResponse>

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
