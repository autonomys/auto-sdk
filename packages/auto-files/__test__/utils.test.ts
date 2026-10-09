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
})
