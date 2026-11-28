import Websocket from 'websocket'
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
  let isOpen = false
  let connected!: Promise<void>
  let markOpen!: () => void
  let failConnection!: (error: Error) => void
  let firstOpen = true
  let closed = false
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined

  const awaitNextOpen = () => {
    connected = new Promise<void>((resolve, reject) => {
      markOpen = resolve
      failConnection = reject
    })
    connected.catch(() => {})
  }
  awaitNextOpen()

  const handleConnection = () => {
    ws = new Websocket.w3cwebsocket(endpoint)

    const scheduleReconnection = () => {
      // If reconnectInterval is null, we don't want to reconnect
      if (reconnectInterval === null) return

      if (debug) {
        console.log('Scheduling reconnection in', reconnectInterval)
      }
      reconnectTimer = setTimeout(() => {
        handleConnection()
        callbacks.onReconnection?.()
      }, reconnectInterval)
    }

    ws.onopen = () => {
      callbacks.onEveryOpen?.()
      if (firstOpen) {
        callbacks.onFirstOpen?.()
        firstOpen = false
      }
      isOpen = true
      markOpen()
    }

    // The close event that always follows an error event schedules the reconnection
    ws.onerror = (event) => {
      callbacks.onError?.(new Error('WebSocket connection error', { cause: event }))
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
      if (!closed) {
        if (isOpen) {
          isOpen = false
          awaitNextOpen()
        }
        if (reconnectInterval === null) {
          failConnection(new Error('WebSocket connection closed'))
        } else {
          scheduleReconnection()
        }
      }
      callbacks.onClose?.(event)
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
    clearTimeout(reconnectTimer)
    if (isOpen) {
      isOpen = false
      awaitNextOpen()
    }
    failConnection(new Error('WebSocket client is closed'))
    ws.close()
  }

  return { send, on, off, close }
}
