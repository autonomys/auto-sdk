import { RpcHandler, WsServer } from '../models/server'

const serverState: {
  wsServer: WsServer | null
  handlers: RpcHandler[]
} = {
  wsServer: null,
  handlers: [],
}

const init = (broadcastServer: WsServer) => {
  serverState.wsServer = broadcastServer

  serverState.wsServer.onMessage((msg, { connection }) => {
    const handler = serverState.handlers.find((handler) => msg.method === handler.method)
    if (handler) {
      handler.handler(msg.params, { connection, messageId: msg.id })
    } else {
      connection.sendUTF(JSON.stringify({ error: 'Method not found' }))
    }
  })
}

export const addRpcHandler = (handler: RpcHandler) => {
  serverState.handlers.push(handler)
}

export const rpcServer = {
  init,
  addRpcHandler,
}
