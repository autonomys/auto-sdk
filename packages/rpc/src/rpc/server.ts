import { safeExecute } from '../utils/error'
import { safeParseJson } from '../utils/json'
import { parseMessage } from '../utils/websocket'
import { WsServer } from '../ws'
import { createWsServer } from '../ws/server'
import { ApiDefinition } from './api'
import {
  MessageResponseQuery,
  messageSchema,
  RpcHandler,
  RpcHandlerList,
  RpcResponse,
  TypedRPCHandler,
} from './types'
import { errorResponse, RpcError, wrapResponse } from './utils'

const isWsServer = (server: any): server is WsServer => {
  return 'broadcastMessage' in server
}

export const createRpcServer = ({
  server,
  initialHandlers,
}: {
  server: WsServer | Parameters<typeof createWsServer>[0]
  initialHandlers?: RpcHandlerList
}) => {
  const wsServer = isWsServer(server) ? server : createWsServer(server)
  const handlers = initialHandlers ?? []

  wsServer.onMessage(async (msg, { connection }) => {
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

      const sendMessageWithId = (message: MessageResponseQuery) => {
        connection.sendUTF(JSON.stringify(wrapResponse(message, parsedMessage.data.id)))
      }

      // Find the handler for the message
      const handler = handlers.find(
        (handler) => parsedMessage.data.method === handler.method,
      )?.handler
      if (!handler) {
        connection.sendUTF(
          JSON.stringify(
            wrapResponse(
              {
                error: { code: 404, message: 'Method not found' },
                jsonrpc: '2.0',
              },
              parsedMessage.data.id,
            ),
          ),
        )
        return
      }

      const catchError = (error: Error): MessageResponseQuery => {
        if (error instanceof RpcError) {
          return errorResponse(error.code, error.message)
        } else {
          return errorResponse(RpcError.Code.InternalError, error?.message ?? 'Unknown error')
        }
      }

      // Handle the message and send the response if it exists
      const response = await safeExecute(
        async () =>
          await handler(parsedMessage.data.params, {
            connection,
            messageId: parsedMessage.data.id,
          }),
      ).catch(catchError)

      if (parsedMessage.data.id && response) {
        sendMessageWithId(response)
      } else if (response) {
        connection.sendUTF(JSON.stringify(wrapResponse(response, undefined)))
      }
    } catch (error) {
      connection.sendUTF(JSON.stringify({ error: 'Unknown error' }))
      return
    }
  })

  const addRpcHandler = <I, O extends RpcResponse>(handler: RpcHandler<I, O>) => {
    handlers.push(handler)
  }

  const close = () => {
    return wsServer.close()
  }

  const listen = (port: number, cb?: () => void) => {
    return wsServer.listen(port, cb)
  }

  return {
    addRpcHandler,
    close,
    listen,
  }
}
