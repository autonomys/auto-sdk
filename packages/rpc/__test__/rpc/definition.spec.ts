import { z } from 'zod'
import { createWsServer } from '../../src'
import { createApiDefinition } from '../../src/rpc/api/definition'
import { createBaseHttpServer, TEST_PORT } from '../utils'

describe('rpc/definition', () => {
  it('should create a client and server', async () => {
    const httpServer = await createBaseHttpServer()

    const { createClient, createServer } = createApiDefinition({
      test: {
        params: z.object({ name: z.string() }),
        returns: z.object({ name: z.string() }),
      },
    })

    createServer(
      {
        test: (params) => {
          return {
            name: params.name,
          }
        },
      },
      {
        server: createWsServer({
          httpServer,
          callbacks: {},
        }),
      },
    )

    const client = createClient({
      endpoint: `ws://localhost:${TEST_PORT}`,
      callbacks: {},
    })

    const result = await client.api.test({ name: 'test' })
    expect(result).toEqual({ name: 'test' })

    httpServer.close()
    client.close()
    await new Promise((resolve) => setTimeout(resolve, 100))
  })
})
