import Websocket from 'websocket'
import { ClientRPC } from '../models/client'
import { MessageQuery, MessageResponse, MessageResponseQuery } from '../models/common'
import { parseData } from '../utils/websocket'
import { createWsClient } from '../ws/client'
import { WsClient } from '../ws/types'
import { ClientRPCListener } from './types'

export const createRpcClient = ({
  endpoint,
  callbacks,
  reconnectInterval = 10_000,
}: {
  endpoint: string
  callbacks: {
    onOpen?: () => void
    onReconnection?: () => void
    onError?: (error: Error) => void
    onClose?: (event: Websocket.ICloseEvent) => void
    onWrongMessage?: (responder: (message: MessageResponseQuery) => void) => void
  }
  reconnectInterval?: number | null
}): ClientRPC => {
  const ws: WsClient = createWsClient({
    endpoint,
    callbacks: {
      onOpen: callbacks.onOpen,
      onReconnection: callbacks.onReconnection,
      onError: callbacks.onError,
      onClose: callbacks.onClose,
    },
    reconnectInterval,
  })

  const connectionMessager = (connection: (message: Websocket.Message) => void) => {
    return (message: MessageResponseQuery) =>
      connection({ type: 'utf8', utf8Data: JSON.stringify(message) })
  }

  let onMessageCallbacks: ClientRPCListener[] = []

  const send = async (message: MessageQuery) => {
    const id = message.id ?? Math.floor(Math.random() * 65546)
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
    } catch (error) {
      callbacks.onWrongMessage?.(rpcResponder)
    }
  })

  const close = (): void => {
    ws.close()
  }

  return { send, on, off, close }
}
