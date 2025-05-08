import http from 'http'
import { connection } from 'websocket'
import { safeExecute } from '../utils/error'
import { parseHttpBody } from '../utils/http'
import { safeParseJson } from '../utils/json'
import { parseMessage } from '../utils/websocket'
import { WsServer } from '../ws'
import { createWsServer } from '../ws/server'
import {
  MessageResponseQuery,
  messageSchema,
  RpcHandler,
  RpcHandlerList,
  RpcResponse,
} from './types'
import { errorResponse, RpcError, wrapResponse } from './utils'

const isWsServer = (
  server: WsServer | Parameters<typeof createWsServer>[0],
): server is WsServer => {
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

  const handleMessage = async ({
    object,
    send,
    connection,
  }: {
    object: object
    send: (msg: string) => void
    connection?: connection
  }) => {
    // Parse the message to ensure it matches the base schema
    const parsedMessage = messageSchema.safeParse(object)
    if (!parsedMessage.success) {
      send(JSON.stringify({ error: 'JSON message does not match RPC base schema' }))
      return
    }

    const sendMessageWithId = (message: MessageResponseQuery) => {
      send(JSON.stringify(wrapResponse(message, parsedMessage.data.id)))
    }

    // Find the handler for the message
    const handler = handlers.find(
      (handler) => parsedMessage.data.method === handler.method,
    )?.handler
    if (!handler) {
      send(
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
          send,
          connection,
          messageId: parsedMessage.data.id,
        }),
    ).catch(catchError)

    if (parsedMessage.data.id && response) {
      sendMessageWithId(response)
    } else if (response) {
      send(JSON.stringify(wrapResponse(response, undefined)))
    }
  }

  wsServer.onMessage(async (msg, { connection }) => {
    try {
      const utf8Data = parseMessage(msg)
      const object = safeParseJson(utf8Data)
      if (!object) {
        connection.sendUTF(JSON.stringify({ error: 'Invalid JSON message' }))
        return
      }

      handleMessage({ object, send: (msg) => connection.sendUTF(msg), connection })
    } catch {
      connection.sendUTF(JSON.stringify({ error: 'Unknown error' }))
      return
    }
  })

  const onHttpRequest = async (req: http.IncomingMessage, res: http.ServerResponse) => {
    try {
      const body = await parseHttpBody(req)
      if (!body) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON message' }))
        return
      }

      const object = safeParseJson(body)
      if (!object) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON message' }))
        return
      }

      handleMessage({ object, send: (msg) => res.end(msg) })
    } catch {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Unknown error' }))
    }
  }
  wsServer.onHttpRequest(onHttpRequest)

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
