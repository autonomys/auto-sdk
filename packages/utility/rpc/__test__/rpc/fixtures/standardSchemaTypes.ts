// Type-checked by types.spec.ts, never run. Every definition must compile, and the calls
// marked as expected errors fail the check if the inferred types are lost (e.g. any).
import { z } from 'zod'
import { z as zod4 } from 'zod/v4'
import { z as otherZod } from 'zod-3.25.55'
import { createApiDefinition, defineUnvalidatedType } from '../../../src'

type Name = { name: string }

const customNameSchema: {
  '~standard': {
    version: 1
    vendor: string
    validate: (value: unknown) => { value: Name } | { issues: Array<{ message: string }> }
    types?: { input: Name; output: Name }
  }
} = {
  '~standard': {
    version: 1,
    vendor: 'test',
    validate: (value) => ({ value: value as Name }),
  },
}

const definition = createApiDefinition({
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
    unvalidated: {
      params: defineUnvalidatedType<Name>(),
      returns: defineUnvalidatedType<Name>(),
    },
  },
  notifications: {
    otherZod3: {
      content: otherZod.object({ name: otherZod.string() }),
    },
  },
})

export const createTypedServer = () =>
  definition.createServer({
    zod3: (params) => ({ name: params.name.toUpperCase() }),
    zod4: (params) => ({ name: params.name.toUpperCase() }),
    otherZod3: (params) => ({ name: params.name.toUpperCase() }),
    custom: (params) => ({ name: params.name.toUpperCase() }),
    unvalidated: (params) => ({ name: params.name.toUpperCase() }),
  })

export const callTypedClient = async () => {
  const client = definition.createHttpClient('http://localhost')

  const results: Name[] = [
    await client.zod3({ name: 'test' }),
    await client.zod4({ name: 'test' }),
    await client.otherZod3({ name: 'test' }),
    await client.custom({ name: 'test' }),
    await client.unvalidated({ name: 'test' }),
  ]

  // @ts-expect-error - name must be a string
  await client.zod4({ name: 1 })
  // @ts-expect-error - name must be a string
  await client.otherZod3({ name: 1 })
  // @ts-expect-error - name must be a string
  await client.custom({ name: 1 })

  return results
}

export const listenTypedNotifications = () => {
  const client = definition.createClient({ endpoint: 'ws://localhost', callbacks: {} })
  client.onNotification('otherZod3', (params) => params.name.toUpperCase())
}
