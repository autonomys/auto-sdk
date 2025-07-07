/* eslint-disable @typescript-eslint/no-explicit-any */
import { connection } from 'websocket'
import { z } from 'zod'
import { PromiseOr } from '../utils/types'
import { ApiDefinition, ApiServerNotificationHandlers } from './api'

export type ClientRPC = {
  send: (message: MessageQuery) => Promise<MessageResponse>
  on: (callback: ClientRPCListener) => void
  off: (callback: ClientRPCListener) => void
  close: () => void
}

export const messageSchema = z.object({
  jsonrpc: z.string(),
  method: z.string(),
  params: z.any(),
  id: z.number().optional(),
})

export type Message = z.infer<typeof messageSchema>

export type MessageQuery = Omit<Message, 'id'> & { id?: number }

export type MessageResponse = {
  jsonrpc: string
  error?: {
    code: number
    message: string
    data?: any
  }
  result?: any
  id: number
}

export type MessageResponseQuery = Omit<MessageResponse, 'id' | 'jsonrpc'> & {
  id?: number
  jsonrpc?: string
}

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

export type RpcParams = {
  send: (msg: string) => void
  connection?: connection
  messageId?: number
}

export type RpcCallback<I, O extends RpcResponse> = (
  params: I,
  rpcParams: RpcParams,
) => O | undefined

export type RpcHandler<I, O extends RpcResponse> = {
  method: string
  handler: RpcCallback<I, O>
}

export type TypedRpcParams<S extends ApiDefinition> = {
  send: (msg: string) => void
  connection?: connection
  messageId?: number
  notificationClient: ApiServerNotificationHandlers<S>
}

export type TypedRpcCallback<I, O extends RpcResponse, S extends ApiDefinition> = (
  params: I,
  rpcParams: TypedRpcParams<S>,
) => O | undefined

export type TypedRPCHandler<I, O extends RpcResponse, S extends ApiDefinition> = {
  method: string
  handler: TypedRpcCallback<I, O, S>
}

export type TypedRpcNotificationHandler<I> = (connection: connection, params: I) => void

export type RpcHandlerList = RpcHandler<any, RpcResponse>[]

export type TypedRpcHandlerList<S extends ApiDefinition> = TypedRPCHandler<any, RpcResponse, S>[]

export type RpcServer = {
  addRpcHandler: (handler: RpcHandler<any, RpcResponse>) => void
  close: () => void
  listen: (port: number, cb?: () => void) => void
}
