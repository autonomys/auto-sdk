import { withRetries } from '../src/utils'

const alwaysFailing = () => {
  let attempts = 0
  return jest.fn(async () => {
    attempts++
    throw new Error(`attempt ${attempts} failed`)
  })
}

describe('withRetries', () => {
  it('makes retries + 1 attempts then rejects with the last error', async () => {
    const fn = alwaysFailing()

    await expect(withRetries(fn, { retries: 2, delay: 1 })).rejects.toThrow('attempt 3 failed')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('makes a single attempt when retries is 0', async () => {
    const fn = alwaysFailing()

    await expect(withRetries(fn, { retries: 0, delay: 1 })).rejects.toThrow('attempt 1 failed')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('resolves with the first successful result', async () => {
    const fn = jest.fn().mockRejectedValueOnce(new Error('transient')).mockResolvedValue('ok')

    await expect(withRetries(fn, { retries: 3, delay: 1 })).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('reports the pending retries before each retry', async () => {
    const onRetry = jest.fn()

    await expect(withRetries(alwaysFailing(), { retries: 2, delay: 1, onRetry })).rejects.toThrow()
    expect(onRetry.mock.calls).toEqual([
      [new Error('attempt 1 failed'), 2],
      [new Error('attempt 2 failed'), 1],
    ])
  })

  it('sanitizes negative retries to zero attempts of retry (1 execution total)', async () => {
    const fn = alwaysFailing()

    await expect(withRetries(fn, { retries: -5, delay: 1 })).rejects.toThrow('attempt 1 failed')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('safely wraps non-Error thrown values into Error instances for onRetry', async () => {
    const onRetry = jest.fn()
    const fn = jest
      .fn()
      .mockRejectedValueOnce('raw string error')
      .mockResolvedValue('recovered')

    const res = await withRetries(fn, { retries: 1, delay: 1, onRetry })
    expect(res).toBe('recovered')
    expect(onRetry).toHaveBeenCalledWith(new Error('raw string error'), 1)
  })
})
