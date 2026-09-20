/* eslint-disable camelcase */
import http from 'http'
import { z } from 'zod'
import {
  createApiDefinition,
  createRpcClient,
  createRpcServer,
  createWsServer,
  defineUnvalidatedType,
} from '../../src'

const TEST_DEVEX_PORT = 19881
const TEST_DEVEX_PORT_2 = 19882
const TEST_DEVEX_PORT_3 = 19883
const TEST_DEVEX_PORT_4 = 19884
const TEST_DEVEX_PORT_5 = 19885
const TEST_DEVEX_PORT_6 = 19886
const TEST_DEVEX_PORT_7 = 19887

describe('RPC HTTP Server DevEx & Type Resolution', () => {
  describe('Issue #356: Underlying HTTP server developer experience', () => {
    it('should allow createWsServer with no arguments (default http server and optional callbacks)', () => {
      const server = createWsServer()
      expect(server.httpServer).toBeInstanceOf(http.Server)
      expect(typeof server.listen).toBe('function')
      expect(typeof server.close).toBe('function')
      server.close()
    })

    it('should allow createRpcServer with no arguments and listen on port', async () => {
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

      expect(rpcServer.httpServer).toBeInstanceOf(http.Server)

      await new Promise<void>((resolve) => {
        rpcServer.listen(TEST_DEVEX_PORT, () => resolve())
      })

      const client = createRpcClient({
        endpoint: 'ws://127.0.0.1:' + TEST_DEVEX_PORT,
        callbacks: {},
      })

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

      client.close()
      rpcServer.close()
    })

    it('should support automatic port binding via options', async () => {
      const rpcServer = createRpcServer({
        port: TEST_DEVEX_PORT_2,
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

      if (!rpcServer.httpServer.listening) {
        await new Promise<void>((resolve) => {
          rpcServer.httpServer.once('listening', () => resolve())
        })
      }

      const client = createRpcClient({
        endpoint: 'ws://127.0.0.1:' + TEST_DEVEX_PORT_2,
        callbacks: {},
      })

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

      client.close()
      rpcServer.close()
    })

    it('should support wrapping an Express-like request listener function', async () => {
      // Simulate an Express app (which is a function (req, res) => void)
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

      await new Promise<void>((resolve) => {
        rpcServer.listen(TEST_DEVEX_PORT_3, () => resolve())
      })

      // Test HTTP route handled by the Express-like listener
      const healthRes = await fetch('http://127.0.0.1:' + TEST_DEVEX_PORT_3 + '/health')
      expect(healthRes.status).toBe(200)
      const healthData = await healthRes.json()
      expect(healthData).toEqual({ status: 'ok' })

      // Test HTTP RPC route (/ws) handled by RPC server
      const rpcHttpRes = await fetch('http://127.0.0.1:' + TEST_DEVEX_PORT_3 + '/ws', {
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
        endpoint: 'ws://127.0.0.1:' + TEST_DEVEX_PORT_3,
        callbacks: {},
      })
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

      wsClient.close()
      rpcServer.close()
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

      await new Promise<void>((resolve) => {
        server.listen(TEST_DEVEX_PORT_4, () => resolve())
      })

      const client = apiDef.createClient({
        endpoint: 'ws://127.0.0.1:' + TEST_DEVEX_PORT_4,
        callbacks: {},
      })

      const result = await client.api.greet({ user: 'Bob' })
      expect(result).toEqual({ greeting: 'Welcome, Bob!' })

      client.close()
      server.close()
    })

    it('should return 404 for non-RPC HTTP requests on default server instead of hanging', async () => {
      const server = createWsServer()
      await new Promise<void>((resolve) => {
        server.listen(TEST_DEVEX_PORT_5, () => resolve())
      })

      const res = await fetch('http://127.0.0.1:' + TEST_DEVEX_PORT_5 + '/unknown-path')
      expect(res.status).toBe(404)
      const text = await res.text()
      expect(text).toBe('Not Found')

      server.close()
    })

    it('should safely close server during asynchronous listen race without leaking socket', async () => {
      const server = createWsServer({ port: TEST_DEVEX_PORT_6 })
      // Call close immediately before the listening event has fired
      server.close()

      // Give event loop time to verify socket is cleanly closed
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(server.httpServer.listening).toBe(false)
    })

    it('should handle overlapping listen calls and reject conflicting ports', async () => {
      const server = createWsServer()
      let callbackInvoked = false

      // First listen begins pending bind
      server.listen(TEST_DEVEX_PORT_7)

      // Second listen to same port while first is pending queues callback
      server.listen(TEST_DEVEX_PORT_7, () => {
        callbackInvoked = true
      })

      // Attempting to listen on a different port while pending throws
      expect(() => {
        server.listen(TEST_DEVEX_PORT_7 + 10)
      }).toThrow()

      // Wait until listening is established
      await new Promise<void>((resolve) => {
        if (server.httpServer.listening) resolve()
        else server.httpServer.once('listening', () => resolve())
      })

      expect(callbackInvoked).toBe(true)

      // Calling listen with a different port once already listening throws
      expect(() => {
        server.listen(TEST_DEVEX_PORT_7 + 10)
      }).toThrow()

      server.close()
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

      mockClient.close()
    })
  })
})
