// Type-checked by types.spec.ts, never run. Clients send the schema input (before transforms
// and defaults are applied), while server handlers receive the parsed output.
import { z } from 'zod'
import { z as zod4 } from 'zod/v4'
import { z as otherZod } from 'zod-3.25.55'
import { createApiDefinition, StandardSchemaV1 } from '../../../src'

const customDateSchema: StandardSchemaV1<{ at: string }, { at: Date }> = {
  '~standard': {
    version: 1,
    vendor: 'test',
    validate: (value) => ({ value: { at: new Date((value as { at: string }).at) } }),
  },
}

const definition = createApiDefinition({
  methods: {
    zod3: {
      params: z.object({
        at: z.string().transform((at) => new Date(at)),
        page: z.number().default(1),
      }),
      returns: z.string(),
    },
    zod4: {
      params: zod4.object({
        at: zod4.string().transform((at) => new Date(at)),
        page: zod4.number().default(1),
      }),
      returns: zod4.string(),
    },
    otherZod3: {
      params: otherZod.object({
        at: otherZod.string().transform((at) => new Date(at)),
        page: otherZod.number().default(1),
      }),
      returns: otherZod.string(),
    },
    custom: {
      params: customDateSchema,
      returns: z.string(),
    },
    zod3Paged: {
      params: z.object({ page: z.number().default(1) }),
      returns: z.string(),
    },
    zod4Paged: {
      params: zod4.object({ page: zod4.number().default(1) }),
      returns: zod4.string(),
    },
    otherZod3Paged: {
      params: otherZod.object({ page: otherZod.number().default(1) }),
      returns: otherZod.string(),
    },
  },
  notifications: {},
})

const handlers = {
  zod3: (params: { at: Date; page: number }) => `${params.at.toISOString()} ${params.page}`,
  zod4: (params: { at: Date; page: number }) => `${params.at.toISOString()} ${params.page}`,
  otherZod3: (params: { at: Date; page: number }) => `${params.at.toISOString()} ${params.page}`,
  custom: (params: { at: Date }) => params.at.toISOString(),
  zod3Paged: (params: { page: number }) => `${params.page}`,
  zod4Paged: (params: { page: number }) => `${params.page}`,
  otherZod3Paged: (params: { page: number }) => `${params.page}`,
}

export const createTypedServer = () => definition.createServer(handlers)

export const callTypedClients = async () => {
  const clients = [
    definition.createHttpClient('http://localhost'),
    definition.createClient({ endpoint: 'ws://localhost', callbacks: {} }).api,
    definition.createMockServerClient({ handlers, callbacks: {} }).api,
  ]

  for (const client of clients) {
    // The server parses the string into a Date and fills in the default page
    await client.zod3({ at: '2026-10-20T00:00:00Z' })
    await client.zod4({ at: '2026-10-20T00:00:00Z' })
    await client.otherZod3({ at: '2026-10-20T00:00:00Z' })
    await client.custom({ at: '2026-10-20T00:00:00Z' })

    // The server fills in the default page, so the client can leave it out
    await client.zod3Paged({})
    await client.zod4Paged({})
    await client.otherZod3Paged({})

    // @ts-expect-error - a Date is sent as a string, the schema input is the string
    await client.zod3({ at: new Date(), page: 1 })
    // @ts-expect-error - a Date is sent as a string, the schema input is the string
    await client.zod4({ at: new Date(), page: 1 })
    // @ts-expect-error - a Date is sent as a string, the schema input is the string
    await client.otherZod3({ at: new Date(), page: 1 })
    // @ts-expect-error - a Date is sent as a string, the schema input is the string
    await client.custom({ at: new Date() })
  }
}
