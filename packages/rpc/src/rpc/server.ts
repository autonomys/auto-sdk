import { messageSchema } from '../models/common'
import { WsServer } from '../models/server'
import { safeParseJson } from '../utils/json'
import { parseMessage } from '../utils/websocket'
import { createWsServer } from '../ws/server'
import { RpcHandler } from './types'

const isWsServer = (server: any): server is WsServer => {
  return 'broadcastMessage' in server
}

export const createRpcServer = (
  server: WsServer | Parameters<typeof createWsServer>[0],
  handlers_: RpcHandler[] = [],
) => {
  const wsServer = isWsServer(server) ? server : createWsServer(server)
  const handlers = handlers_ ?? []

  wsServer.onMessage((msg, { connection }) => {
    try {
      const utf8Data = parseMessage(msg)
      const object = safeParseJson(utf8Data)
      if (!object) {
        connection.sendUTF(JSON.stringify({ error: 'Invalid JSON message' }))
        return
      }

      // Parse the message to ensure it matches the base schema
      const parsedMessage = messageSchema.safeParse(object)
      if (!parsedMessage.success) {
        connection.sendUTF(JSON.stringify({ error: 'JSON message does not match RPC base schema' }))
        return
      }

      // Find the handler for the message
      const handler = handlers.find(
        (handler) => parsedMessage.data.method === handler.method,
      )?.handler
      if (!handler) {
        connection.sendUTF(JSON.stringify({ error: 'Method not found' }))
        return
      }

      // Handle the message and send the response if it exists
      const response = handler(parsedMessage.data, (message) => {
        connection.sendUTF(JSON.stringify(message))
      })
      if (response) {
        connection.sendUTF(JSON.stringify(response))
      }
    } catch (error) {
      connection.sendUTF(JSON.stringify({ error: 'Invalid message' }))
      return
    }
  })

  const addRpcHandler = (handler: RpcHandler) => {
    handlers.push(handler)
  }

  return {
    addRpcHandler,
  }
}
