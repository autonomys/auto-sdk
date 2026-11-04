import { AddressInfo } from 'net'
import { z } from 'zod'
import { createApiDefinition, createRpcServer } from '../../src'
import { RpcError } from '../../src/rpc/utils'

describe('RPC server with unserializable handler results', () => {
  const apiDef = createApiDefinition({
    methods: {
      big: {
        params: z.object({}),
        returns: z.object({ n: z.bigint() }),
      },
      ping: {
        params: z.object({}),
        returns: z.object({ ok: z.boolean() }),
      },
    },
    notifications: {},
  })

  let server: ReturnType<typeof apiDef.createServer>
  let port: number

  beforeAll(async () => {
    server = apiDef.createServer({
      big: () => ({ n: BigInt(1) }),
      ping: () => ({ ok: true }),
    })
    await new Promise<void>((resolve) => server.listen(0, () => resolve()))
    port = (server.httpServer.address() as AddressInfo).port
  })

  afterAll(() => {
    server.close()
  })

  const expectSerializationError = (error: unknown) => {
    expect(error).toBeInstanceOf(RpcError)
    expect((error as RpcError).code).toBe(RpcError.Code.InternalError)
    expect((error as RpcError).message).toBe(
      'Failed to serialize response: Do not know how to serialize a BigInt',
    )
  }

  it('returns an InternalError over HTTP and keeps serving', async () => {
    const client = apiDef.createHttpClient(`http://127.0.0.1:${port}/ws`)

    const error = await client.big({}).catch((err) => err)
    expectSerializationError(error)

    await expect(client.ping({})).resolves.toEqual({ ok: true })
  })

  it('returns an InternalError over WebSocket and keeps serving', async () => {
    const client = apiDef.createClient({ endpoint: `ws://127.0.0.1:${port}`, callbacks: {} })

    try {
      const error = await client.api.big({}).catch((err) => err)
      expectSerializationError(error)

      await expect(client.api.ping({})).resolves.toEqual({ ok: true })
    } finally {
      client.close()
    }
  })

  it('returns an InternalError for a request without an id', async () => {
    const rawServer = createRpcServer({
      initialHandlers: [
        {
          method: 'big',
          handler: () => ({ jsonrpc: '2.0', id: 1, result: BigInt(1) }),
        },
      ],
    })

    try {
      await new Promise<void>((resolve) => rawServer.listen(0, () => resolve()))
      const rawPort = (rawServer.httpServer.address() as AddressInfo).port

      const res = await fetch(`http://127.0.0.1:${rawPort}/ws`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'big', params: {} }),
      })

      expect(await res.json()).toEqual({
        jsonrpc: '2.0',
        error: {
          code: RpcError.Code.InternalError,
          message: 'Failed to serialize response: Do not know how to serialize a BigInt',
        },
      })
    } finally {
      rawServer.close()
    }
  })
})
