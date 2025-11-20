import Websocket from 'websocket'
import { randomId } from '../utils'
import { parseData } from '../utils/websocket'
import { createWsClient } from '../ws/client'
import { WsClient } from '../ws/types'
import {
  ClientRPC,
  ClientRPCListener,
  MessageQuery,
  MessageResponse,
  MessageResponseQuery,
  RpcClientCallbacks,
} from './types'

export const createRpcClient = ({
  endpoint,
  callbacks,
  reconnectInterval = 10_000,
  debug = false,
}: {
  endpoint: string
  callbacks: RpcClientCallbacks
  reconnectInterval?: number | null
  debug?: boolean
}): ClientRPC => {
  const ws: WsClient = createWsClient({
    endpoint,
    callbacks: {
      onEveryOpen: callbacks.onEveryOpen,
      onFirstOpen: callbacks.onFirstOpen,
      onReconnection: callbacks.onReconnection,
      onError: callbacks.onError,
      onClose: callbacks.onClose,
    },
    reconnectInterval,
    debug,
  })

  const connectionMessager = (connection: (message: Websocket.Message) => void) => {
    return (message: MessageResponseQuery) =>
      connection({ type: 'utf8', utf8Data: JSON.stringify(message) })
  }

  let onMessageCallbacks: ClientRPCListener[] = []

  const send = async (message: MessageQuery) => {
    const id = message.id ?? randomId()
    const messageWithID = { ...message, id }

    return new Promise<MessageResponse>((resolve, reject) => {
      const cb = (event: MessageResponse) => {
        try {
          if (event.id === id) {
            off(cb)
            resolve(event)
          }
        } catch (error) {
          reject(error)
        }
      }
      on(cb)

      ws.send(JSON.stringify(messageWithID))
    })
  }

  const on = (callback: ClientRPCListener) => {
    onMessageCallbacks.push(callback)
  }

  const off = (callback: ClientRPCListener) => {
    onMessageCallbacks = onMessageCallbacks.filter((cb) => cb !== callback)
  }

  ws.on((message, responder) => {
    const rpcResponder = connectionMessager(responder)
    try {
      const messageObj = JSON.parse(parseData(message))
      onMessageCallbacks.forEach((callback) => callback(messageObj))
    } catch {
      callbacks.onWrongMessage?.(rpcResponder)
    }
  })

  const close = (): void => {
    ws.close()
  }

  return { send, on, off, close }
}
