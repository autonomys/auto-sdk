import http from 'http'
import { z } from 'zod'
import { createApiDefinition } from './src/rpc/api/definition'
import { defineUnvalidatedType } from './src/rpc/api/typing'
import { createWsServer } from './src/ws/server'

const server = createApiDefinition({
  test: {
    params: defineUnvalidatedType<{ name: string }>(),
    returns: z.object({
      name: z.string(),
    }),
  },
})

server
  .createClient({
    endpoint: 'ws://localhost:8080',
    callbacks: {
      onOpen: () => {
        console.log('open')
      },
    },
  })
  .api.test({ name: 'test' })

server.createServer(
  {
    test: (params) => {
      return {
        name: params.name,
      }
    },
  },
  {
    server: createWsServer({
      httpServer: http.createServer(),
      callbacks: {},
    }),
  },
)
