import { MessageResponseQuery } from '../models/common'

export const wrapResponse = (message: MessageResponseQuery, id: number | undefined) => {
  return { ...message, id, jsonrpc: '2.0' }
}

export const errorResponse = (code: number, message: string) => {
  return {
    error: {
      code,
      message,
    },
  }
}

export class RpcError extends Error {
  static readonly Code = {
    ParseError: -32700,
    InvalidRequest: -32600,
    MethodNotFound: -32601,
    InvalidParams: -32602,
    InternalError: -32603,
    Custom: -32000,
  }

  constructor(
    message: string,
    public code: number,
  ) {
    super(message)
  }
}
