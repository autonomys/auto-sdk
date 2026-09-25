/* eslint-disable camelcase */
import http from 'http'
import { AddressInfo } from 'net'
import { z } from 'zod'
import {
  createApiDefinition,
  createRpcClient,
  createRpcServer,
  createWsServer,
  defineUnvalidatedType,
} from '../../src'

describe('RPC HTTP Server DevEx & Type Resolution', () => {
  const serversToClose: Array<{ close: () => void }> = []
  const clientsToClose: Array<{ close: () => void }> = []

  afterEach(() => {
    while (clientsToClose.length > 0) {
      clientsToClose.pop()?.close()
    }
    while (serversToClose.length > 0) {
      serversToClose.pop()?.close()
    }
  })

  const getPort = (server: { httpServer: http.Server }): number => {
    const addr = server.httpServer.address() as AddressInfo
    return addr.port
  }

  describe('Issue #356: Underlying HTTP server developer experience', () => {
    it('should allow createWsServer with no arguments (default http server and optional callbacks)', () => {
      const server = createWsServer()
      serversToClose.push(server)
      expect(server.httpServer).toBeInstanceOf(http.Server)
      expect(typeof server.listen).toBe('function')
      expect(typeof server.close).toBe('function')
    })

    it('should allow createRpcServer with no arguments and listen on dynamic port', async () => {
      const rpcServer = createRpcServer({
        initialHandlers: [
          {
            method: 'ping',
            handler: () => ({
              jsonrpc: '2.0',
              result: 'pong',
              id: 1,
            }),
          },
        ],
      })
      serversToClose.push(rpcServer)

      expect(rpcServer.httpServer).toBeInstanceOf(http.Server)

      await new Promise<void>((resolve) => {
        rpcServer.listen(0, () => resolve())
      })

      const port = getPort(rpcServer)
      const client = createRpcClient({
        endpoint: 'ws://127.0.0.1:' + port,
        callbacks: {},
      })
      clientsToClose.push(client)

      const response = await client.send({
        jsonrpc: '2.0',
        method: 'ping',
        id: 1,
        params: {},
      })

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        result: 'pong',
      })
    })

    it('should support automatic port binding via options (port: 0)', async () => {
      const rpcServer = createRpcServer({
        port: 0,
        initialHandlers: [
          {
            method: 'hello',
            handler: (params: { name: string }) => ({
              jsonrpc: '2.0',
              result: 'Hello, ' + params.name + '!',
              id: 2,
            }),
          },
        ],
      })
      serversToClose.push(rpcServer)

      if (!rpcServer.httpServer.listening) {
        await new Promise<void>((resolve) => {
          rpcServer.httpServer.once('listening', () => resolve())
        })
      }

      const port = getPort(rpcServer)
      const client = createRpcClient({
        endpoint: 'ws://127.0.0.1:' + port,
        callbacks: {},
      })
      clientsToClose.push(client)

      const response = await client.send({
        jsonrpc: '2.0',
        method: 'hello',
        id: 2,
        params: { name: 'Alice' },
      })

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 2,
        result: 'Hello, Alice!',
      })
    })

    it('should support wrapping an Express-like request listener function', async () => {
      const expressApp: http.RequestListener = (req, res) => {
        if (req.method === 'GET' && req.url === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ status: 'ok' }))
          return
        }
        res.writeHead(404)
        res.end()
      }

      const rpcServer = createRpcServer({
        httpServer: expressApp,
        initialHandlers: [
          {
            method: 'echo',
            handler: (params: { text: string }, { messageId }) => ({
              jsonrpc: '2.0',
              result: params.text,
              id: messageId ?? 0,
            }),
          },
        ],
      })
      serversToClose.push(rpcServer)

      await new Promise<void>((resolve) => {
        rpcServer.listen(0, () => resolve())
      })

      const port = getPort(rpcServer)

      // Test HTTP route handled by the Express-like listener
      const healthRes = await fetch('http://127.0.0.1:' + port + '/health')
      expect(healthRes.status).toBe(200)
      const healthData = await healthRes.json()
      expect(healthData).toEqual({ status: 'ok' })

      // Test HTTP RPC route (/ws) handled by RPC server
      const rpcHttpRes = await fetch('http://127.0.0.1:' + port + '/ws', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'echo',
          id: 42,
          params: { text: 'express integration' },
        }),
      })
      expect(rpcHttpRes.status).toBe(200)
      const rpcHttpData = await rpcHttpRes.json()
      expect(rpcHttpData).toEqual({
        jsonrpc: '2.0',
        id: 42,
        result: 'express integration',
      })

      // Test WebSocket RPC connection
      const wsClient = createRpcClient({
        endpoint: 'ws://127.0.0.1:' + port,
        callbacks: {},
      })
      clientsToClose.push(wsClient)

      const wsRes = await wsClient.send({
        jsonrpc: '2.0',
        method: 'echo',
        id: 43,
        params: { text: 'ws integration' },
      })
      expect(wsRes).toEqual({
        jsonrpc: '2.0',
        id: 43,
        result: 'ws integration',
      })
    })

    it('should allow apiDefinition.createServer without server arguments and listen smoothly', async () => {
      const apiDef = createApiDefinition({
        methods: {
          greet: {
            params: z.object({ user: z.string() }),
            returns: z.object({ greeting: z.string() }),
          },
        },
        notifications: {},
      })

      const server = apiDef.createServer({
        greet: (params) => ({
          greeting: 'Welcome, ' + params.user + '!',
        }),
      })
      serversToClose.push(server)

      await new Promise<void>((resolve) => {
        server.listen(0, () => resolve())
      })

      const port = getPort(server)
      const client = apiDef.createClient({
        endpoint: 'ws://127.0.0.1:' + port,
        callbacks: {},
      })
      clientsToClose.push(client)

      const result = await client.api.greet({ user: 'Bob' })
      expect(result).toEqual({ greeting: 'Welcome, Bob!' })
    })

    it('should return 404 for non-RPC HTTP requests on default server instead of hanging', async () => {
      const server = createWsServer()
      serversToClose.push(server)

      await new Promise<void>((resolve) => {
        server.listen(0, () => resolve())
      })

      const port = getPort(server)
      const res = await fetch('http://127.0.0.1:' + port + '/unknown-path')
      expect(res.status).toBe(404)
      const text = await res.text()
      expect(text).toBe('Not Found')
    })

    it('should safely close server during asynchronous listen race without leaking socket', async () => {
      const server = createWsServer({ port: 0 })
      serversToClose.push(server)
      // Call close immediately before the listening event has fired
      server.close()

      // Give event loop time to verify socket is cleanly closed
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(server.httpServer.listening).toBe(false)
    })

    it('should handle overlapping listen calls and reject conflicting ports', async () => {
      const server = createWsServer()
      serversToClose.push(server)
      let callbackInvoked = false

      // First listen begins pending bind on dynamic port 0
      server.listen(0)

      // Second listen to same port while first is pending queues callback
      server.listen(0, () => {
        callbackInvoked = true
      })

      // Attempting to listen on an explicit conflicting port while pending throws
      expect(() => {
        server.listen(19999)
      }).toThrow()

      // Wait until listening is established
      await new Promise<void>((resolve) => {
        if (server.httpServer.listening) resolve()
        else server.httpServer.once('listening', () => resolve())
      })

      expect(callbackInvoked).toBe(true)

      const boundPort = getPort(server)

      // Calling listen with a different port once already listening throws
      expect(() => {
        server.listen(boundPort + 100)
      }).toThrow()
    })

    it('should reset pending state on listen error and notify callbacks.onError without uncaught crash', async () => {
      // Start server A on an allocated port
      const serverA = createWsServer()
      serversToClose.push(serverA)
      await new Promise<void>((resolve) => serverA.listen(0, () => resolve()))
      const busyPort = getPort(serverA)

      // Server B tries to bind to the same port
      let capturedError: Error | null = null
      const serverB = createWsServer({
        callbacks: {
          onError: (err) => {
            capturedError = err
          },
        },
      })
      serversToClose.push(serverB)

      serverB.listen(busyPort)

      // Wait for the EADDRINUSE error
      await new Promise<void>((resolve) => {
        if (capturedError) resolve()
        else serverB.httpServer.once('error', () => resolve())
      })

      expect(capturedError).not.toBeNull()
      expect((capturedError as any)?.code).toBe('EADDRINUSE')

      // Server B should no longer be stuck in pending state and can successfully listen on a free port
      await new Promise<void>((resolve) => {
        serverB.listen(0, () => resolve())
      })
      expect(serverB.httpServer.listening).toBe(true)
    })

    it('should not let top-level undefined options overwrite nested server options', () => {
      const customHttpServer = http.createServer()
      serversToClose.push({ close: () => customHttpServer.close() })

      const rpcServer = createRpcServer({
        server: { httpServer: customHttpServer },
        httpServer: undefined,
      })
      serversToClose.push(rpcServer)

      expect(rpcServer.httpServer).toBe(customHttpServer)
    })

    it('should listen when server is an existing WsServer and port option is provided', async () => {
      const existingWsServer = createWsServer()
      serversToClose.push(existingWsServer)

      const rpcServer = createRpcServer({
        server: existingWsServer,
        port: 0,
      })
      serversToClose.push(rpcServer)

      await new Promise<void>((resolve) => {
        if (existingWsServer.httpServer.listening) resolve()
        else existingWsServer.httpServer.once('listening', () => resolve())
      })

      expect(existingWsServer.httpServer.listening).toBe(true)
    })

    it('should detect port from already listening httpServer and reject conflicting listen', async () => {
      const preStartedServer = http.createServer()
      await new Promise<void>((resolve) => preStartedServer.listen(0, () => resolve()))
      const actualPort = (preStartedServer.address() as AddressInfo).port

      const wsServer = createWsServer({ httpServer: preStartedServer })
      serversToClose.push(wsServer)

      // Calling listen with the correct already bound port should succeed
      let samePortCallbackCalled = false
      wsServer.listen(actualPort, () => {
        samePortCallbackCalled = true
      })
      expect(samePortCallbackCalled).toBe(true)

      // Calling listen with a different port should throw
      expect(() => {
        wsServer.listen(actualPort + 10)
      }).toThrow(`Server is already listening on port ${actualPort}`)
    })
  })

  describe('Issue #448: Zod validator type resolution', () => {
    it('should resolve complex nested and composed zod types without TS depth recursion errors', async () => {
      const nestedItemSchema = z.object({
        id: z.string().uuid(),
        tags: z.array(z.string()),
        metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
      })

      const complexRequestSchema = z.object({
        filter: z.object({
          status: z.enum(['active', 'pending', 'archived']),
          range: z.object({
            min: z.number().min(0),
            max: z.number().max(1000),
          }),
        }),
        items: z.array(nestedItemSchema),
        pagination: z.object({
          page: z.number().int().positive(),
          pageSize: z.number().int().max(100),
        }),
      })

      const complexResponseSchema = z.object({
        success: z.boolean(),
        total: z.number(),
        results: z.array(nestedItemSchema),
        appliedFilter: z.string(),
      })

      const apiDef = createApiDefinition({
        methods: {
          queryComplexData: {
            params: complexRequestSchema,
            returns: complexResponseSchema,
          },
          unvalidatedMethod: {
            params: defineUnvalidatedType<{ query: string }>(),
            returns: defineUnvalidatedType<{ matched: boolean }>(),
          },
        },
        notifications: {
          updateNotification: {
            content: nestedItemSchema,
          },
        },
      })

      const mockClient = apiDef.createMockServerClient({
        handlers: {
          queryComplexData: (params) => {
            return {
              success: true,
              total: params.items.length,
              results: params.items,
              appliedFilter: params.filter.status,
            }
          },
          unvalidatedMethod: (params) => {
            return { matched: params.query === 'test' }
          },
        },
        callbacks: {},
      })
      clientsToClose.push(mockClient)

      const res = await mockClient.api.queryComplexData({
        filter: {
          status: 'active',
          range: { min: 10, max: 200 },
        },
        items: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            tags: ['rpc', 'test'],
            metadata: { count: 42, active: true },
          },
        ],
        pagination: { page: 1, pageSize: 10 },
      })

      expect(res.success).toBe(true)
      expect(res.total).toBe(1)
      expect(res.appliedFilter).toBe('active')

      const unvalidatedRes = await mockClient.api.unvalidatedMethod({ query: 'test' })
      expect(unvalidatedRes.matched).toBe(true)
    })
  })
})
