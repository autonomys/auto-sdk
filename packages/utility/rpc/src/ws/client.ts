import Websocket from 'websocket'
import { schedule, unresolvablePromise } from '../utils/misc'
import { WsClient, WsMessageResponseCallback } from './types'

export const createWsClient = ({
  endpoint,
  callbacks,
  reconnectInterval = 10_000,
  debug = false,
}: {
  endpoint: string
  callbacks: {
    onEveryOpen?: () => void
    onFirstOpen?: () => void
    onReconnection?: () => void
    onError?: (error: Error) => void
    onClose?: (event: Websocket.ICloseEvent) => void
  }
  reconnectInterval?: number | null
  debug?: boolean
}): WsClient => {
  let ws: Websocket.w3cwebsocket
  let onMessageCallbacks: WsMessageResponseCallback[] = []
  let connected: Promise<void> = unresolvablePromise
  let firstOpen = true
  let closed = false

  const handleConnection = () => {
    ws = new Websocket.w3cwebsocket(endpoint)
    connected = new Promise<void>((resolve) => {
      ws.onopen = () => {
        callbacks.onEveryOpen?.()
        if (firstOpen) {
          callbacks.onFirstOpen?.()
          firstOpen = false
        }
        resolve()
      }
    })

    const handleErrorOrClose = () => {
      // If reconnectInterval is null, we don't want to reconnect
      if (reconnectInterval === null) return

      if (debug) {
        console.log('Scheduling reconnection in', reconnectInterval)
      }
      schedule(() => {
        handleConnection()
        callbacks.onReconnection?.()
      }, reconnectInterval)
    }

    ws.onerror = (event) => {
      callbacks.onError?.(event)
      if (!closed) {
        handleErrorOrClose()
      }
      if (debug) {
        console.log('onerror', event)
      }
    }

    ws.onmessage = (event) => {
      onMessageCallbacks.forEach((callback) => callback(event.data, (message) => ws.send(message)))
    }

    ws.onclose = (event) => {
      if (debug) {
        console.log('handling onclose', event)
      }
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

  const on = (callback: WsMessageResponseCallback) => {
    onMessageCallbacks.push(callback)
  }

  const off = (callback: WsMessageResponseCallback) => {
    onMessageCallbacks = onMessageCallbacks.filter((cb) => cb !== callback)
  }

  const close = () => {
    if (closed) return
    closed = true
    ws.close()
  }

  return { send, on, off, close }
}
