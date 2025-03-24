import Websocket from 'websocket'
import { ClientRPC } from '../models/client'
import { Message, MessageQuery, messageSchema } from '../models/common'
import { unresolvablePromise } from '../utils'
import { parseData } from '../utils/websocket'
import { createWsClient } from '../ws/client'
import { WsClient } from '../ws/types'
import { RpcCallback } from './types'

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
    onWrongMessage?: (responder: (message: string) => void) => void
  }
  reconnectInterval?: number | null
}): ClientRPC => {
  let ws: WsClient = createWsClient({
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
    return (message: string) => connection({ type: 'utf8', utf8Data: message })
  }

  let onMessageCallbacks: RpcCallback[] = []

  const send = async (message: MessageQuery) => {
    const id = message.id ?? Math.floor(Math.random() * 65546)
    const messageWithID = { ...message, id }

    return new Promise<Message>((resolve, reject) => {
      const cb = (event: Message) => {
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

  const on = (callback: (event: Message) => void) => {
    onMessageCallbacks.push(callback)
  }

  const off = (callback: (event: Message) => void) => {
    onMessageCallbacks = onMessageCallbacks.filter((cb) => cb !== callback)
  }

  ws.on((message, responder) => {
    const rpcResponder = connectionMessager(responder)
    try {
      const messageObj = JSON.parse(parseData(message))
      onMessageCallbacks.forEach((callback) => callback(messageObj, rpcResponder))
    } catch (error) {
      callbacks.onWrongMessage?.(rpcResponder)
    }
  })

  const close = (): void => {
    ws.close()
  }

  return { send, on, off, close }
}
