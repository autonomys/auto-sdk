// Type-checked by types.spec.ts, never run. Clients send the schema input (before transforms
// and defaults are applied), while server handlers receive the parsed output. For results it's
// the other way round: handlers return the input and clients get the parsed output.
import Websocket from 'websocket'
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

const customDateResultSchema: StandardSchemaV1<string, Date> = {
  '~standard': {
    version: 1,
    vendor: 'test',
    validate: (value) => ({ value: new Date(value as string) }),
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
    zod3DateResult: {
      params: z.object({ at: z.string() }),
      returns: z.string().transform((at) => new Date(at)),
    },
    zod4DateResult: {
      params: zod4.object({ at: zod4.string() }),
      returns: zod4.string().transform((at) => new Date(at)),
    },
    otherZod3DateResult: {
      params: otherZod.object({ at: otherZod.string() }),
      returns: otherZod.string().transform((at) => new Date(at)),
    },
    customDateResult: {
      params: z.object({ at: z.string() }),
      returns: customDateResultSchema,
    },
  },
  notifications: {
    zod3Date: {
      content: z.object({ at: z.string().transform((at) => new Date(at)) }),
    },
    zod4Date: {
      content: zod4.object({ at: zod4.string().transform((at) => new Date(at)) }),
    },
    otherZod3Date: {
      content: otherZod.object({ at: otherZod.string().transform((at) => new Date(at)) }),
    },
    customDate: {
      content: customDateSchema,
    },
  },
})

const handlers = {
  zod3: (params: { at: Date; page: number }) => `${params.at.toISOString()} ${params.page}`,
  zod4: (params: { at: Date; page: number }) => `${params.at.toISOString()} ${params.page}`,
  otherZod3: (params: { at: Date; page: number }) => `${params.at.toISOString()} ${params.page}`,
  custom: (params: { at: Date }) => params.at.toISOString(),
  zod3Paged: (params: { page: number }) => `${params.page}`,
  zod4Paged: (params: { page: number }) => `${params.page}`,
  otherZod3Paged: (params: { page: number }) => `${params.page}`,
  // The result is sent as JSON and parsed by the client, so handlers return the string
  zod3DateResult: (params: { at: string }) => params.at,
  zod4DateResult: (params: { at: string }) => params.at,
  otherZod3DateResult: (params: { at: string }) => params.at,
  customDateResult: (params: { at: string }) => params.at,
}

export const dateResultHandlers: Partial<Parameters<typeof definition.createServer>[0]> = {
  // @ts-expect-error - a Date result is sent as a string, the schema input is the string
  zod3DateResult: () => new Date(),
  // @ts-expect-error - a Date result is sent as a string, the schema input is the string
  zod4DateResult: () => new Date(),
  // @ts-expect-error - a Date result is sent as a string, the schema input is the string
  otherZod3DateResult: () => new Date(),
  // @ts-expect-error - a Date result is sent as a string, the schema input is the string
  customDateResult: () => new Date(),
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

    // The client parses the string result into a Date
    const zod3At: Date = await client.zod3DateResult({ at: '2026-10-20T00:00:00Z' })
    const zod4At: Date = await client.zod4DateResult({ at: '2026-10-20T00:00:00Z' })
    const otherZod3At: Date = await client.otherZod3DateResult({ at: '2026-10-20T00:00:00Z' })
    const customAt: Date = await client.customDateResult({ at: '2026-10-20T00:00:00Z' })
    void [zod3At, zod4At, otherZod3At, customAt]

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

export const sendTypedNotifications = (connection: Websocket.connection) => {
  const notificationClients = [
    createTypedServer().notificationClient,
    definition.createMockServerClient({ handlers, callbacks: {} }).notificationClient,
  ]

  for (const notificationClient of notificationClients) {
    // The server sends the string and the client parses it into a Date
    notificationClient.zod3Date(connection, { at: '2026-10-20T00:00:00Z' })
    notificationClient.zod4Date(connection, { at: '2026-10-20T00:00:00Z' })
    notificationClient.otherZod3Date(connection, { at: '2026-10-20T00:00:00Z' })
    notificationClient.customDate(connection, { at: '2026-10-20T00:00:00Z' })

    // @ts-expect-error - a Date is sent as a string, the schema input is the string
    notificationClient.zod3Date(connection, { at: new Date() })
    // @ts-expect-error - a Date is sent as a string, the schema input is the string
    notificationClient.zod4Date(connection, { at: new Date() })
    // @ts-expect-error - a Date is sent as a string, the schema input is the string
    notificationClient.otherZod3Date(connection, { at: new Date() })
    // @ts-expect-error - a Date is sent as a string, the schema input is the string
    notificationClient.customDate(connection, { at: new Date() })
  }
}

export const receiveTypedNotifications = () => {
  const clients = [
    definition.createClient({ endpoint: 'ws://localhost', callbacks: {} }),
    definition.createMockServerClient({ handlers, callbacks: {} }),
  ]

  for (const client of clients) {
    // The client handlers get the parsed Date
    client.onNotification('zod3Date', (params) => {
      const at: Date = params.at
      void at
    })
    client.onNotification('zod4Date', (params) => {
      const at: Date = params.at
      void at
    })
    client.onNotification('otherZod3Date', (params) => {
      const at: Date = params.at
      void at
    })
    client.onNotification('customDate', (params) => {
      const at: Date = params.at
      void at
    })
  }
}
