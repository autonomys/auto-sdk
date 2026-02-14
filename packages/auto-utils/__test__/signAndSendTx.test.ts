import { signAndSendTx } from '../src/utils/signAndSendTx'

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Build a minimal mock SubmittableResult.
 */
function mockResult(overrides: {
  status: Record<string, unknown>
  events?: Array<{ event: { section: string; method: string; data: unknown[] } }>
  txHash?: string
}): any {
  const status: Record<string, unknown> = {
    isInBlock: false,
    isFinalized: false,
    isRetracted: false,
    isFinalityTimeout: false,
    isDropped: false,
    isInvalid: false,
  }
  for (const [key, val] of Object.entries(overrides.status)) {
    status[key] = val
  }
  return {
    status,
    events: (overrides.events ?? []).map((e) => ({ event: e.event })),
    dispatchError: undefined,
    txHash: { toHex: () => overrides.txHash ?? '0xabc123' },
  }
}

const IN_BLOCK_OK = (blockHex = '0xblock') =>
  mockResult({
    status: { isInBlock: true, asInBlock: { toHex: () => blockHex } },
    events: [{ event: { section: 'system', method: 'ExtrinsicSuccess', data: [] } }],
  })

type Callback = (result: any) => void

describe('signAndSendTx', () => {
  const sender = 'alice'

  /** Create a mock tx with controllable outer promise and captured callback. */
  function createMockTx() {
    let cb: Callback
    let resolveOuter: (unsub: () => void) => void
    let rejectOuter: (err: unknown) => void

    const tx = {
      signAndSend: jest.fn((_s: any, _o: any, callback: Callback) => {
        cb = callback
        return new Promise<() => void>((res, rej) => {
          resolveOuter = res
          rejectOuter = rej
        })
      }),
    } as any

    return {
      tx,
      fire: (result: any) => cb(result),
      resolveOuter: (unsub: () => void) => resolveOuter(unsub),
      rejectOuter: (err: unknown) => rejectOuter(err),
    }
  }

  const flush = () => new Promise((r) => setTimeout(r, 0))

  test('wallet rejection rejects the returned promise', async () => {
    const mock = createMockTx()
    const promise = signAndSendTx(sender, mock.tx, {}, [])

    mock.rejectOuter(new Error('Rejected by user'))

    await expect(promise).rejects.toThrow('Rejected by user')
  })

  test('slow path: outer resolves before callback — unsub called on settlement', async () => {
    const mock = createMockTx()
    const unsub = jest.fn()

    const promise = signAndSendTx(sender, mock.tx, {}, [])

    // .then() fires first, stores unsub
    mock.resolveOuter(unsub)
    await flush()
    expect(unsub).not.toHaveBeenCalled()

    // Status callback fires, settling the promise
    mock.fire(IN_BLOCK_OK())

    const result = await promise
    expect(result.txHash).toBeDefined()
    expect(unsub).toHaveBeenCalledTimes(1)
  })

  test('fast path: callback settles before outer resolves — unsub called when outer resolves', async () => {
    const mock = createMockTx()
    const unsub = jest.fn()

    const promise = signAndSendTx(sender, mock.tx, {}, [])

    // Status callback fires first
    mock.fire(IN_BLOCK_OK())

    const result = await promise
    expect(result.txHash).toBeDefined()
    expect(unsub).not.toHaveBeenCalled()

    // Outer resolves later — should call unsub immediately since already settled
    mock.resolveOuter(unsub)
    await flush()
    expect(unsub).toHaveBeenCalledTimes(1)
  })

  test('synchronous throw from signAndSend rejects the promise', async () => {
    const tx = {
      signAndSend: jest.fn(() => {
        throw new Error('Extension not available')
      }),
    } as any

    await expect(signAndSendTx(sender, tx, {}, [])).rejects.toThrow('Extension not available')
  })

  test('settled guard: isFinalized after isInBlock is a safe no-op', async () => {
    const mock = createMockTx()
    const unsub = jest.fn()

    const promise = signAndSendTx(sender, mock.tx, {}, [])

    mock.resolveOuter(unsub)
    await flush()

    // First: isInBlock settles the promise
    mock.fire(IN_BLOCK_OK('0xblock3'))
    const result = await promise
    expect(result.txHash).toBeDefined()

    // Second: isFinalized — must not throw
    expect(() =>
      mock.fire(
        mockResult({
          status: { isFinalized: true, asFinalized: { toHex: () => '0xfinal' } },
          events: [{ event: { section: 'system', method: 'ExtrinsicSuccess', data: [] } }],
        }),
      ),
    ).not.toThrow()
  })

  test('transaction failure (isDropped) rejects and unsubs', async () => {
    const mock = createMockTx()
    const unsub = jest.fn()

    const promise = signAndSendTx(sender, mock.tx, {}, [])

    mock.resolveOuter(unsub)
    await flush()

    mock.fire(mockResult({ status: { isDropped: true } }))

    await expect(promise).rejects.toThrow('Transaction failed')
    expect(unsub).toHaveBeenCalledTimes(1)
  })
})
