import http from 'http'
import { AddressInfo } from 'net'
import { z } from 'zod'
import { z as zod4 } from 'zod/v4'
import { z as otherZod } from 'zod-3.25.55'
import { createWsServer, defineUnvalidatedType } from '../../src'
import { createApiDefinition } from '../../src/rpc/api/definition'
import { StandardSchemaV1 } from '../../src/rpc/api/standardSchema'
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
const alwaysInvalidSchema: StandardSchemaV1<Name> = {
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

// Returns a new value, like a zod transform, so the handler can tell parsed from raw params
const upperCaseNameSchema: StandardSchemaV1<Name> = {
  '~standard': {
    version: 1 as const,
    vendor: 'test',
    validate: (value) =>
      typeof value === 'object' &&
      value !== null &&
      typeof (value as { name?: unknown }).name === 'string'
        ? { value: { name: (value as Name).name.toUpperCase() } }
        : { issues: [{ message: 'Expected a name', path: ['name'] }] },
  },
}

describe('rpc/definition parsed params', () => {
  let httpServer: http.Server
  const received: unknown[] = []

  const definition = createApiDefinition({
    methods: {
      zod3: {
        params: z.object({ name: z.string().transform((name) => name.toUpperCase()) }),
        returns: defineUnvalidatedType<Name>(),
      },
      zod4: {
        params: zod4.object({ name: zod4.string().transform((name) => name.toUpperCase()) }),
        returns: defineUnvalidatedType<Name>(),
      },
      otherZod3: {
        params: otherZod.object({
          name: otherZod.string().transform((name) => name.toUpperCase()),
        }),
        returns: defineUnvalidatedType<Name>(),
      },
      custom: {
        params: upperCaseNameSchema,
        returns: defineUnvalidatedType<Name>(),
      },
    },
    notifications: {},
  })
  const { createServer, createHttpClient, createMockServerClient } = definition
  let server: ReturnType<typeof createServer>
  let client: ReturnType<typeof createHttpClient>
  let mockClient: ReturnType<typeof createMockServerClient>

  // Echoes back the params it receives
  const handler = (params: Name) => {
    received.push(params)
    return params
  }
  const handlers = { zod3: handler, zod4: handler, otherZod3: handler, custom: handler }

  beforeAll(async () => {
    // Free port, so connections left open by other suites on TEST_PORT can't interfere
    httpServer = http.createServer()
    httpServer.listen(0)
    await new Promise((resolve) => httpServer.once('listening', resolve))
    server = createServer(handlers, {
      server: createWsServer({
        httpServer,
        callbacks: {},
      }),
    })
    const { port } = httpServer.address() as AddressInfo
    client = createHttpClient(`http://localhost:${port}/ws`)
    mockClient = createMockServerClient({ handlers, callbacks: {} })
  })

  beforeEach(() => {
    received.length = 0
  })

  afterAll(() => {
    mockClient.close()
    server.close()
    httpServer.close()
  })

  describe.each(['zod3', 'zod4', 'otherZod3', 'custom'] as const)('%s schema', (method) => {
    it('should pass the parsed params to the server handler', async () => {
      await expect(client[method]({ name: 'test' })).resolves.toEqual({ name: 'TEST' })
      expect(received).toEqual([{ name: 'TEST' }])
    })

    it('should pass the parsed params to the mock handler', async () => {
      await expect(mockClient.api[method]({ name: 'test' })).resolves.toEqual({ name: 'TEST' })
      expect(received).toEqual([{ name: 'TEST' }])
    })

    it('should reject invalid params in the mock client before calling the handler', async () => {
      await expect(mockClient.api[method]({ name: 1 } as unknown as Name)).rejects.toMatchObject({
        code: RpcError.Code.InvalidParams,
      })
      expect(received).toEqual([])
    })
  })

  // zod strips keys that aren't in the schema, so handlers no longer receive them
  it('should not pass keys missing from the schema to the handler', async () => {
    const params = { name: 'test', extra: 1 } as unknown as Name

    await client.zod3(params)
    await mockClient.api.zod3(params)
    expect(received).toEqual([{ name: 'TEST' }, { name: 'TEST' }])
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
