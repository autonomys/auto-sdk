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
  let onMessageCallbacks: ClientRPCListener[] = []
  let closed = false
  let terminalError: Error | undefined
  const pendingRequests = new Set<(error: Error) => void>()

  const rejectPendingRequests = (error: Error) => {
    for (const rejectPending of Array.from(pendingRequests)) {
      rejectPending(error)
    }
  }

  const ws: WsClient = createWsClient({
    endpoint,
    callbacks: {
      onEveryOpen: callbacks.onEveryOpen,
      onFirstOpen: callbacks.onFirstOpen,
      onReconnection: callbacks.onReconnection,
      onError: callbacks.onError,
      onClose: (event) => {
        if (!closed && reconnectInterval === null) {
          terminalError = new Error('WebSocket connection closed')
          rejectPendingRequests(terminalError)
        }
        callbacks.onClose?.(event)
      },
    },
    reconnectInterval,
    debug,
  })

  const connectionMessager = (connection: (message: Websocket.Message) => void) => {
    return (message: MessageResponseQuery) =>
      connection({ type: 'utf8', utf8Data: JSON.stringify(message) })
  }

  const send = async (message: MessageQuery) => {
    if (closed || terminalError) {
      throw terminalError ?? new Error('RPC client is closed')
    }

    const id = message.id ?? randomId()
    const messageWithID = { ...message, id }
    const payload = JSON.stringify(messageWithID)

    return new Promise<MessageResponse>((resolve, reject) => {
      let settled = false

      const cleanup = () => {
        off(cb)
        pendingRequests.delete(rejectPending)
      }

      const cb = (event: MessageResponse) => {
        try {
          if (event.id === id) {
            settled = true
            cleanup()
            resolve(event)
          }
        } catch (error) {
          settled = true
          cleanup()
          reject(error)
        }
      }

      const rejectPending = (error: Error) => {
        if (settled) return
        settled = true
        cleanup()
        reject(error)
      }

      pendingRequests.add(rejectPending)
      on(cb)

      try {
        Promise.resolve(ws.send(payload)).catch((error) => {
          rejectPending(error instanceof Error ? error : new Error(String(error)))
        })
      } catch (error) {
        rejectPending(error instanceof Error ? error : new Error(String(error)))
      }
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
    if (!closed) {
      closed = true
      terminalError = new Error('RPC client is closed')
      rejectPendingRequests(terminalError)
    }
    ws.close()
  }

  return { send, on, off, close }
}
