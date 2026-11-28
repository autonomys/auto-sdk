import { createRpcClient } from '../../src'
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
  })
})
