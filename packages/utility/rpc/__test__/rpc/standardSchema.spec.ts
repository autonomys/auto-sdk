import http from 'http'
import { AddressInfo } from 'net'
import { z } from 'zod'
import { z as zod4 } from 'zod/v4'
import { z as otherZod } from 'zod-3.25.55'
import { createWsServer, defineUnvalidatedType } from '../../src'
import { createApiDefinition } from '../../src/rpc/api/definition'
import { isStandardSchema } from '../../src/rpc/api/typing'
import { RpcError } from '../../src/rpc/utils'

type Name = { name: string }

// A Standard Schema that is not zod, with an async validate as the spec allows
const customNameSchema: {
  '~standard': {
    version: 1
    vendor: string
    validate: (
      value: unknown,
    ) => Promise<{ value: Name } | { issues: Array<{ message: string; path: string[] }> }>
    types?: { input: Name; output: Name }
  }
} = {
  '~standard': {
    version: 1,
    vendor: 'test',
    validate: async (value) =>
      typeof value === 'object' &&
      value !== null &&
      typeof (value as { name?: unknown }).name === 'string'
        ? { value: value as Name }
        : { issues: [{ message: 'Expected a name', path: ['name'] }] },
  },
}

// Always fails, with one issue on a field and one on the whole value
const alwaysInvalidSchema = {
  '~standard': {
    version: 1 as const,
    vendor: 'test',
    validate: () => ({
      issues: [{ message: 'Expected a name', path: ['name'] }, { message: 'Expected an object' }],
    }),
  },
}

const INVALID_RESULT_NAME = 'return an invalid result'

describe('rpc/definition with Standard Schema', () => {
  let httpServer: http.Server
  const received: unknown[] = []

  const { createServer, createHttpClient } = createApiDefinition({
    methods: {
      zod3: {
        params: z.object({ name: z.string() }),
        returns: z.object({ name: z.string() }),
      },
      zod4: {
        params: zod4.object({ name: zod4.string() }),
        returns: zod4.object({ name: zod4.string() }),
      },
      otherZod3: {
        params: otherZod.object({ name: otherZod.string() }),
        returns: otherZod.object({ name: otherZod.string() }),
      },
      custom: {
        params: customNameSchema,
        returns: customNameSchema,
      },
      alwaysInvalid: {
        params: alwaysInvalidSchema,
        returns: defineUnvalidatedType<Name>(),
      },
      transformedResult: {
        params: z.object({ name: z.string() }),
        returns: z.object({ name: z.string().transform((name) => name.toUpperCase()) }),
      },
      unvalidated: {
        params: defineUnvalidatedType<Name>(),
        returns: defineUnvalidatedType<Name>(),
      },
    },
    notifications: {},
  })
  let server: ReturnType<typeof createServer>
  let client: ReturnType<typeof createHttpClient>

  // Echoes the name back, or returns a result that doesn't match the schema
  const handler = (params: Name) => {
    received.push(params)
    if (params.name === INVALID_RESULT_NAME) {
      return { name: 1 } as unknown as Name
    }
    return { name: params.name }
  }

  beforeAll(async () => {
    // Free port, so connections left open by other suites on TEST_PORT can't interfere
    httpServer = http.createServer()
    httpServer.listen(0)
    await new Promise((resolve) => httpServer.once('listening', resolve))
    server = createServer(
      {
        zod3: handler,
        zod4: handler,
        otherZod3: handler,
        custom: handler,
        alwaysInvalid: handler,
        transformedResult: handler,
        unvalidated: handler,
      },
      {
        server: createWsServer({
          httpServer,
          callbacks: {},
        }),
      },
    )
    const { port } = httpServer.address() as AddressInfo
    client = createHttpClient(`http://localhost:${port}/ws`)
  })

  beforeEach(() => {
    received.length = 0
  })

  afterAll(() => {
    server.close()
    httpServer.close()
  })

  describe.each(['zod3', 'zod4', 'otherZod3', 'custom'] as const)('%s schema', (method) => {
    it('should accept valid params', async () => {
      await expect(client[method]({ name: 'test' })).resolves.toEqual({ name: 'test' })
      expect(received).toEqual([{ name: 'test' }])
    })

    it('should reject invalid params before calling the handler', async () => {
      await expect(client[method]({ name: 1 } as unknown as Name)).rejects.toMatchObject({
        code: RpcError.Code.InvalidParams,
      })
      expect(received).toEqual([])
    })

    it('should reject an invalid result in the http client', async () => {
      await expect(client[method]({ name: INVALID_RESULT_NAME })).rejects.toMatchObject({
        code: RpcError.Code.InvalidParams,
      })
    })
  })

  it('should build the error message from the schema issues', async () => {
    await expect(client.custom({ name: 1 } as unknown as Name)).rejects.toMatchObject({
      code: RpcError.Code.InvalidParams,
      message: 'name: Expected a name',
    })
  })

  it('should join every issue in the error message', async () => {
    await expect(client.alwaysInvalid({ name: 'test' })).rejects.toMatchObject({
      code: RpcError.Code.InvalidParams,
      message: 'name: Expected a name; Expected an object',
    })
  })

  it('should return the parsed result in the http client', async () => {
    await expect(client.transformedResult({ name: 'test' })).resolves.toEqual({ name: 'TEST' })
  })

  it('should not validate unvalidated types', async () => {
    await expect(client.unvalidated({ name: 1 } as unknown as Name)).resolves.toEqual({ name: 1 })
    expect(received).toEqual([{ name: 1 }])
  })
})

describe('isStandardSchema', () => {
  it('should detect object and function schemas by their ~standard property', () => {
    // Some libraries (e.g. ArkType) use callable functions as schemas
    const functionSchema = Object.assign(() => undefined, {
      '~standard': customNameSchema['~standard'],
    })

    expect(isStandardSchema(z.string())).toBe(true)
    expect(isStandardSchema(customNameSchema)).toBe(true)
    expect(isStandardSchema(functionSchema)).toBe(true)
    expect(isStandardSchema(defineUnvalidatedType<Name>())).toBe(false)
    expect(isStandardSchema(null)).toBe(false)
  })
})
