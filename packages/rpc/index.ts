import { rpc } from '@autonomys/auto-consensus'
import http from 'http'
import { createRpcClient, createRpcServer, createWsServer } from './src'
import { Message } from './src/models/common'

const baseServer = http.createServer()

baseServer.listen(1234, () => {
  console.log('Server is running on port 1234')
})

const rpcServer = createRpcServer({
  server: createWsServer({
    httpServer: baseServer,
    callbacks: {},
  }),
  initialHandlers: [
    {
      method: 'test',
      handler: (message: Message) => {
        if (!message.id) {
          return undefined
        }

        return {
          jsonrpc: '2.0',
          result: {
            success: true,
          },
          id: message.id,
        }
      },
    },
  ],
})

const client = createRpcClient({
  endpoint: 'ws://localhost:1234',
  callbacks: {},
})

client
  .send({
    jsonrpc: '2.0',
    method: 'test',
    id: 1,
  })
  .then((response) => {
    console.log('response', response.method)
  })
