import { AddressInfo } from 'net'
import { createRpcClient, createRpcServer } from '../../src'
import { installStubWebSocket, StubSocket } from '../utils'

describe('createRpcClient disconnect and close handling', () => {
  const unhandledRejections: unknown[] = []
  const onUnhandledRejection = (reason: unknown) => {
    unhandledRejections.push(reason)
  }

  beforeEach(() => {
    unhandledRejections.length = 0
    process.on('unhandledRejection', onUnhandledRejection)
  })

  afterEach(() => {
    process.off('unhandledRejection', onUnhandledRejection)
    expect(unhandledRejections).toEqual([])
  })

  describe('with stubbed socket and fake timers', () => {
    let sockets: StubSocket[]

    beforeEach(() => {
      jest.useFakeTimers()
      sockets = installStubWebSocket().sockets
    })

    afterEach(() => {
      jest.useRealTimers()
      jest.restoreAllMocks()
    })

    it('queues RPC send during reconnect backoff and resolves after reconnection', async () => {
      const reconnectInterval = 10_000
      const rpcClient = createRpcClient({
        endpoint: 'ws://localhost:9999',
        callbacks: {},
        reconnectInterval,
      })

      sockets[0].open()
      sockets[0].closeFromServer()

      const responsePromise = rpcClient.send({
        jsonrpc: '2.0',
        method: 'ping',
        id: 7,
        params: {},
      })

      await Promise.resolve()
      expect(sockets[0].send).not.toHaveBeenCalled()

      jest.advanceTimersByTime(reconnectInterval)
      expect(sockets).toHaveLength(2)

      sockets[1].open()
      await Promise.resolve()
      expect(sockets[1].send).toHaveBeenCalledTimes(1)

      sockets[1].receive(JSON.stringify({ jsonrpc: '2.0', id: 7, result: 'pong' }))
      await expect(responsePromise).resolves.toEqual({ jsonrpc: '2.0', id: 7, result: 'pong' })

      rpcClient.close()
    })

    it('rejects RPC promise and cleans up its response listener when ws.send fails', async () => {
      const rpcClient = createRpcClient({
        endpoint: 'ws://localhost:9999',
        callbacks: {},
        reconnectInterval: 10_000,
      })

      sockets[0].open()
      sockets[0].send.mockImplementationOnce(() => {
        throw new Error('send failed')
      })

      await expect(
        rpcClient.send({
          jsonrpc: '2.0',
          method: 'ping',
          id: 11,
          params: {},
        }),
      ).rejects.toThrow('send failed')

      let idReads = 0
      const spyPayload = {
        get id() {
          idReads += 1
          return 11
        },
      }
      jest.spyOn(JSON, 'parse').mockReturnValueOnce(spyPayload)
      sockets[0].receive(JSON.stringify({ jsonrpc: '2.0', id: 11, result: 'late' }))

      expect(idReads).toBe(0)
      rpcClient.close()
    })

    it('rejects in-flight RPC call and removes its listener on close()', async () => {
      const rpcClient = createRpcClient({
        endpoint: 'ws://localhost:9999',
        callbacks: {},
        reconnectInterval: 10_000,
      })

      sockets[0].open()
      const pendingRpc = rpcClient.send({
        jsonrpc: '2.0',
        method: 'slow',
        id: 21,
        params: {},
      })

      await Promise.resolve()
      expect(sockets[0].send).toHaveBeenCalledTimes(1)

      rpcClient.close()
      await expect(pendingRpc).rejects.toThrow('RPC client is closed')
      await expect(
        rpcClient.send({
          jsonrpc: '2.0',
          method: 'afterClose',
          id: 22,
          params: {},
        }),
      ).rejects.toThrow('RPC client is closed')

      let idReads = 0
      const spyPayload = {
        get id() {
          idReads += 1
          return 21
        },
      }
      jest.spyOn(JSON, 'parse').mockReturnValueOnce(spyPayload)
      sockets[0].receive(JSON.stringify({ jsonrpc: '2.0', id: 21, result: 'late' }))

      expect(idReads).toBe(0)
    })

    it('rejects in-flight and new RPC calls when reconnectInterval is null and socket closes', async () => {
      const rpcClient = createRpcClient({
        endpoint: 'ws://localhost:9999',
        callbacks: {},
        reconnectInterval: null,
      })

      sockets[0].open()
      const inFlight = rpcClient.send({
        jsonrpc: '2.0',
        method: 'pending',
        id: 31,
        params: {},
      })

      await Promise.resolve()
      expect(sockets[0].send).toHaveBeenCalledTimes(1)

      sockets[0].closeFromServer()

      await expect(inFlight).rejects.toThrow('WebSocket connection closed')
      await expect(
        rpcClient.send({
          jsonrpc: '2.0',
          method: 'afterDisconnect',
          id: 32,
          params: {},
        }),
      ).rejects.toThrow('WebSocket connection closed')

      rpcClient.close()
    })
  })

  describe('with local RPC server', () => {
    it('rejects in-flight RPC call on close() instead of hanging', async () => {
      let releaseHandler: (() => void) | undefined
      let handlerCalled!: () => void
      const handlerInvoked = new Promise<void>((resolve) => {
        handlerCalled = resolve
      })

      const rpcServer = createRpcServer({
        initialHandlers: [
          {
            method: 'hang',
            handler: () => {
              handlerCalled()
              return new Promise((resolve) => {
                releaseHandler = () => resolve(undefined)
              })
            },
          },
        ],
      })

      await new Promise<void>((resolve) => rpcServer.listen(0, () => resolve()))
      const port = (rpcServer.httpServer.address() as AddressInfo).port
      const rpcClient = createRpcClient({
        endpoint: `ws://127.0.0.1:${port}`,
        callbacks: {},
        reconnectInterval: 10_000,
      })

      try {
        const pendingRpc = rpcClient.send({
          jsonrpc: '2.0',
          method: 'hang',
          id: 41,
          params: {},
        })

        await handlerInvoked
        rpcClient.close()

        await expect(pendingRpc).rejects.toThrow('RPC client is closed')
        await expect(
          rpcClient.send({
            jsonrpc: '2.0',
            method: 'hang',
            id: 42,
            params: {},
          }),
        ).rejects.toThrow('RPC client is closed')
      } finally {
        releaseHandler?.()
        rpcClient.close()
        rpcServer.close()
      }
    })

    it('rejects pending and new RPC calls when reconnectInterval is null and server closes', async () => {
      let handlerCalled!: () => void
      const handlerInvoked = new Promise<void>((resolve) => {
        handlerCalled = resolve
      })

      const rpcServer = createRpcServer({
        initialHandlers: [
          {
            method: 'slow',
            handler: () => {
              handlerCalled()
              return undefined
            },
          },
        ],
      })

      await new Promise<void>((resolve) => rpcServer.listen(0, () => resolve()))
      const port = (rpcServer.httpServer.address() as AddressInfo).port
      const rpcClient = createRpcClient({
        endpoint: `ws://127.0.0.1:${port}`,
        callbacks: {},
        reconnectInterval: null,
      })

      try {
        const pendingRpc = rpcClient.send({
          jsonrpc: '2.0',
          method: 'slow',
          id: 51,
          params: {},
        })

        await handlerInvoked
        rpcServer.close()

        await expect(pendingRpc).rejects.toThrow('WebSocket connection closed')
        await expect(
          rpcClient.send({
            jsonrpc: '2.0',
            method: 'slow',
            id: 52,
            params: {},
          }),
        ).rejects.toThrow('WebSocket connection closed')
      } finally {
        rpcClient.close()
        rpcServer.close()
      }
    })
  })
})
