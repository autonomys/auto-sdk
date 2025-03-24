import { messageSchema } from '../models/common'
import { WsServer } from '../models/server'
import { parseMessage } from '../utils/websocket'
import { RpcHandler } from './types'

export const createRpcServer = (server: WsServer) => {
  const wsServer = server
  let handlers: RpcHandler[] = []

  wsServer.onMessage((msg, { connection }) => {
    const parsedMessage = messageSchema.safeParse(parseMessage(msg))
    if (!parsedMessage.success) {
      connection.sendUTF(JSON.stringify({ error: 'Invalid message' }))
      return
    }

    const handler = handlers.find(
      (handler) => parsedMessage.data.method === handler.method,
    )?.handler

    if (!handler) {
      connection.sendUTF(JSON.stringify({ error: 'Method not found' }))
      return
    }

    handler(parsedMessage.data, (message) => {
      connection.sendUTF(JSON.stringify(message))
    })
  })

  const addRpcHandler = (handler: RpcHandler) => {
    handlers.push(handler)
  }

  return {
    addRpcHandler,
  }
}
