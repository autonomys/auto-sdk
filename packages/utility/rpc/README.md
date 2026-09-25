# @autonomys/rpc

This package intends to ease the implementation of custom RPC protocols through the following features:

- Robust connection controller (e.g reconnection handles).
- Built-in RPC protocol.
- Creation of api definition for having type safety.

## Type-Safe RPC APIs

One of the objectives of this package is to achieve type safety when implementing an RPC server and ease the creation of the RPC client.

For solving this problem we should create an `ApiDefinition` that basically consists of the definition of RPC methods with their input or outputs.

Example:

```ts
const apiDefinition = createApiDefinition({
  test: {
    params: z.object({ name: z.string() }),
    returns: z.object({ name: z.string() }),
  },
})
```

The object from above defines a RPC server with the single `test` method that receives as params `{ name: string }` and returns the same.

Usually, we'd want to validate that the input and the output are correctly being constructed respecting the defined types. For this reason type definition has been implemented with `ZodTypes`. However, if for some reason you don't want to implement validators you can use the method `defineUnvalidatedType<T>()`:

```ts
type TypeWithNoValidation = string // Any type could be used here

const apiDefinition = createApiDefinition({
  test: {
    params: z.object({ name: z.string() }),
    returns: defineUnvalidatedType<TypeWithNoValidation>(),
  },
})
```

### Define Server RPC Handlers

Once our API interface is defined the server RPC handlers ought to be defined:

```ts
const apiDefinition = createApiDefinition({
  test: {
    params: z.object({ name: z.string() }),
    returns: defineUnvalidatedType<TypeWithNoValidation>(),
  },
})

const server = apiDefinition.createServer({
  test: (params) => {
    return {
      name: params.name,
    }
  },
})

server.listen(8080)
```

You can also pass an existing HTTP server, Express application, or port:

```ts
const server = apiDefinition.createServer(
  {
    test: (params) => ({ name: params.name }),
  },
  {
    httpServer: app, // Express app or http.Server instance
    port: 8080,
  },
)
```

### Use Type-Safe RPC Client

Once the server is running, using the same API definition the client could be simply built by:

```ts
const apiDefinition = createApiDefinition({
  test: {
    params: z.object({ name: z.string() }),
    returns: defineUnvalidatedType<TypeWithNoValidation>(),
  },
})

const client = apiDefinition.createClient({
  endpoint: `<ws-server-endpoint>`,
  callbacks: {},
})

client
  .test({
    name: 'log',
  })
  .then((e) => console.log(e)) /// { name: "xyz" }
```

## Set Up the RPC Server (w/o type safety)

You can create an RPC server by using the `createRpcServer` function with an optional list of initial handlers. You can listen directly on a port or attach to an existing HTTP server / Express app:

```ts
import { createRpcServer } from '@autonomys/rpc'

const rpcServer = createRpcServer({
  initialHandlers: [
    {
      method: 'test',
      handler: () => ({
        jsonrpc: '2.0',
        result: 'success',
        id: 1,
      }),
    },
  ],
})

rpcServer.listen(8080)
```

Or pass `port` or an Express `app` directly:

```ts
const rpcServer = createRpcServer({
  httpServer: app, // optional: Express application or http.Server
  port: 8080,      // optional: auto-starts listening on port
  initialHandlers: [...],
})
```

## Set Up the RPC Client (w/o type safety)

You can create an RPC client by using the `createRpcClient` function. This function requires a WS(S) endpoint and to setup callbacks for certain events. Here’s an example of how to set it up:

```ts
import { createRpcClient } from '../../src'

const setupRpcClient = async () => {
  const rpcClient = createRpcClient({
    endpoint: `ws://localhost:8080`,
    callbacks: {},
  })

  return rpcClient
}

// Example usage
const rpcClient = await setupRpcClient()

const response = await rpcClient.send({
  jsonrpc: '2.0',
  method: 'test',
  id: 1,
  params: {},
})

console.log(response)
```
