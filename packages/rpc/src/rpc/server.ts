import { MessageResponse, MessageResponseQuery, messageSchema } from '../models/common'
import { WsServer } from '../models/server'
import { safeParseJson } from '../utils/json'
import { parseMessage } from '../utils/websocket'
import { createWsServer } from '../ws/server'
import { RpcHandler } from './types'

const isWsServer = (server: any): server is WsServer => {
  return 'broadcastMessage' in server
}

export const createRpcServer = ({
  server,
  initialHandlers,
}: {
  server: WsServer | Parameters<typeof createWsServer>[0]
  initialHandlers?: RpcHandler[]
}) => {
  const wsServer = isWsServer(server) ? server : createWsServer(server)
  const handlers = initialHandlers ?? []
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
      const wrapResponse = (message: Omit<MessageResponse, 'id'>) => {
        return { ...message, id: parsedMessage.data.id }
      }

      const sendMessageWithId = (message: MessageResponseQuery) => {
        connection.sendUTF(JSON.stringify(wrapResponse(message)))
      }

      // Find the handler for the message
      const handler = handlers.find(
        (handler) => parsedMessage.data.method === handler.method,
      )?.handler
      if (!handler) {
        connection.sendUTF(
          JSON.stringify(
            wrapResponse({
              error: { code: 404, message: 'Method not found' },
              jsonrpc: '2.0',
            }),
          ),
        )
        return
      }

      // Handle the message and send the response if it exists
      const response = handler(parsedMessage.data, (message: MessageResponseQuery) => {
        sendMessageWithId(message)
      })
      if (parsedMessage.data.id && response) {
        sendMessageWithId(response)
      }
    } catch (error) {
      connection.sendUTF(JSON.stringify({ error: 'Unknown error' }))
      return
    }
  })

  const addRpcHandler = (handler: RpcHandler) => {
    handlers.push(handler)
  }

  const close = () => {
    return wsServer.close()
  }

  return {
    addRpcHandler,
    close,
  }
}
