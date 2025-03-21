import Websocket from 'websocket'
import { ClientRPC } from '../models/client'
import { Message, MessageQuery } from '../models/common'
import { schedule, unresolvablePromise } from '../utils'

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
  }
  reconnectInterval?: number | null
}): ClientRPC => {
  let ws: Websocket.w3cwebsocket
  let onMessageCallbacks: ((event: Message) => void)[] = []
  let connected: Promise<void> = unresolvablePromise
  let closed = false

  const handleConnection = () => {
    ws = new Websocket.w3cwebsocket(endpoint)
    connected = new Promise((resolve) => {
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
      connected = unresolvablePromise
      callbacks.onError?.(event)
      if (!closed) {
        handleErrorOrClose()
      }
    }

    ws.onmessage = (event) => {
      onMessageCallbacks.forEach((callback) => callback(JSON.parse(event.data.toString())))
    }

    ws.onclose = (event) => {
      connected = unresolvablePromise
      callbacks.onClose?.(event)
      if (!closed) {
        handleErrorOrClose()
      }
    }
  }

  // Init connection
  handleConnection()

  const send = async (message: MessageQuery) => {
    await connected

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

  const close = () => {
    if (closed) return
    closed = true
    ws.close()
  }

  return { send, on, off, close }
}
