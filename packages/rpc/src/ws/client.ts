import Websocket from 'websocket'
import { schedule, unresolvablePromise } from '../utils'
import { encodeMessage } from '../utils/websocket'
import { WsClient, WsMessageCallback } from './types'

export const createWsClient = ({
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
  }
  reconnectInterval?: number | null
}): WsClient => {
  let ws: Websocket.w3cwebsocket
  let onMessageCallbacks: WsMessageCallback[] = []
  let connected: Promise<void> = unresolvablePromise
  let closed = false

  const handleConnection = () => {
    ws = new Websocket.w3cwebsocket(endpoint)
    connected = new Promise<void>((resolve) => {
      ws.onopen = () => {
        callbacks.onOpen?.()
        resolve()
      }
    })

    const handleErrorOrClose = () => {
      // If reconnectInterval is null, we don't want to reconnect
      if (reconnectInterval === null) return

      schedule(() => {
        handleConnection()
        callbacks.onReconnection?.()
      }, reconnectInterval)
    }

    ws.onerror = (event) => {
      // connected = unresolvablePromise
      callbacks.onError?.(event)
      if (!closed) {
        handleErrorOrClose()
      }
    }

    ws.onmessage = (event) => {
      onMessageCallbacks.forEach((callback) => callback(event.data, (message) => ws.send(message)))
    }

    ws.onclose = (event) => {
      // connected = unresolvablePromise
      callbacks.onClose?.(event)
      if (!closed) {
        handleErrorOrClose()
      }
    }
  }

  // Init connection
  handleConnection()

  const send = async (message: Websocket.IMessageEvent['data']) => {
    await connected
    ws.send(message)
  }

  const on = (callback: WsMessageCallback) => {
    onMessageCallbacks.push(callback)
  }

  const off = (callback: WsMessageCallback) => {
    onMessageCallbacks = onMessageCallbacks.filter((cb) => cb !== callback)
  }

  const close = () => {
    if (closed) return
    closed = true
    ws.close()
  }

  return { send, on, off, close }
}
