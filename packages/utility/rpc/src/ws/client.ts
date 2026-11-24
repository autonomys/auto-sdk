import Websocket from 'websocket'
import { WsClient, WsMessageResponseCallback } from './types'

type ConnectionDeferred = {
  promise: Promise<void>
  resolve: () => void
  reject: (error: Error) => void
}

const createConnectionDeferred = (): ConnectionDeferred => {
  let resolve!: () => void
  let reject!: (error: Error) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  // Prevent unhandled rejections if close()/disconnect happens while no send() is awaiting
  promise.catch(() => {})
  return { promise, resolve, reject }
}

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
  let connectionDeferred = createConnectionDeferred()
  let isOpen = false
  let terminalError: Error | undefined
  let firstOpen = true
  let closed = false
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined

  const getTerminalError = () => terminalError

  const resetPendingConnection = () => {
    if (isOpen && !terminalError) {
      connectionDeferred = createConnectionDeferred()
      isOpen = false
    }
  }

  const resolvePendingConnection = () => {
    if (!isOpen && !terminalError) {
      isOpen = true
      connectionDeferred.resolve()
    }
  }

  const rejectConnection = (error: Error) => {
    if (terminalError) return
    terminalError = error
    if (!isOpen) {
      connectionDeferred.reject(error)
    } else {
      isOpen = false
      const rejected = createConnectionDeferred()
      rejected.reject(error)
      connectionDeferred = rejected
    }
  }

  const handleConnection = () => {
    if (closed) return

    const currentWs = new Websocket.w3cwebsocket(endpoint)
    ws = currentWs

    const scheduleReconnection = () => {
      // If reconnectInterval is null, we don't want to reconnect
      if (reconnectInterval === null) return

      if (debug) {
        console.log('Scheduling reconnection in', reconnectInterval)
      }
      reconnectTimer = setTimeout(() => {
        reconnectTimer = undefined
        handleConnection()
        callbacks.onReconnection?.()
      }, reconnectInterval)
    }

    currentWs.onopen = () => {
      if (closed || ws !== currentWs) return
      callbacks.onEveryOpen?.()
      if (firstOpen) {
        callbacks.onFirstOpen?.()
        firstOpen = false
      }
      if (!closed && ws === currentWs) {
        resolvePendingConnection()
      }
    }

    // The close event that always follows an error event schedules the reconnection
    currentWs.onerror = (event) => {
      callbacks.onError?.(new Error('WebSocket connection error', { cause: event }))
      if (debug) {
        console.log('onerror', event)
      }
    }

    currentWs.onmessage = (event) => {
      onMessageCallbacks.forEach((callback) =>
        callback(event.data, (message) => currentWs.send(message)),
      )
    }

    currentWs.onclose = (event) => {
      if (debug) {
        console.log('handling onclose', event)
      }
      if (!closed && ws === currentWs) {
        if (reconnectInterval === null) {
          rejectConnection(new Error('WebSocket connection closed'))
        } else {
          resetPendingConnection()
          scheduleReconnection()
        }
      }
      callbacks.onClose?.(event)
    }
  }

  // Init connection
  handleConnection()

  const send = async (message: Websocket.IMessageEvent['data']) => {
    while (true) {
      const error = getTerminalError()
      if (error) {
        throw error
      }
      const deferred = connectionDeferred
      await deferred.promise
      const postAwaitError = getTerminalError()
      if (postAwaitError) {
        throw postAwaitError
      }
      if (connectionDeferred !== deferred) {
        continue
      }
      ws.send(message)
      return
    }
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
    reconnectTimer = undefined
    rejectConnection(new Error('WebSocket client is closed'))
    ws.close()
  }

  return { send, on, off, close }
}
