import { retryWithBackoff, withTimeout } from '../utils'

describe('utils', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('withTimeout', () => {
    it('should resolve if promise resolves before timeout', async () => {
      const promise = Promise.resolve('success')
      const result = await withTimeout(promise, 1000)
      expect(result).toBe('success')
    })

    it('should reject if promise rejects before timeout', async () => {
      const error = new Error('Immediate error')
      const promise = Promise.reject(error)
      await expect(withTimeout(promise, 1000)).rejects.toThrow('Immediate error')
    })

    it('should reject with timeout error if operation exceeds timeout', async () => {
      const slowPromise = new Promise<string>((resolve) => {
        setTimeout(() => resolve('too late'), 5000)
      })

      const timeoutPromise = withTimeout(slowPromise, 1000)
      const assertion = expect(timeoutPromise).rejects.toThrow('Operation timed out after 1000ms')
      await jest.advanceTimersByTimeAsync(1000)

      await assertion
    })

    it('should not cause unhandled rejection if promise rejects after timeout fires', async () => {
      let lateReject: (err: Error) => void = () => {}
      const slowPromise = new Promise<string>((_, reject) => {
        lateReject = reject
      })

      const timeoutPromise = withTimeout(slowPromise, 500)
      const assertion = expect(timeoutPromise).rejects.toThrow('Operation timed out after 500ms')
      await jest.advanceTimersByTimeAsync(500)

      await assertion

      // Trigger late rejection in background; should not crash
      expect(() => lateReject(new Error('Background crash'))).not.toThrow()
    })
  })

  describe('retryWithBackoff', () => {
    it('should return result on first attempt if successful', async () => {
      const fn = jest.fn().mockResolvedValue('ok')
      const result = await retryWithBackoff(fn)
      expect(result).toBe('ok')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should retry on failure and eventually succeed', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success')

      const promise = retryWithBackoff(fn, { maxRetries: 3, initialDelay: 100 })

      // Advance timers for backoff delays
      await jest.advanceTimersByTimeAsync(100) // first retry delay: 100 * 2^0 = 100
      await jest.advanceTimersByTimeAsync(200) // second retry delay: 100 * 2^1 = 200

      const result = await promise
      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(3)
    })

    it('should throw last error when maxRetries is exhausted', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('persistent failure'))

      const promise = retryWithBackoff(fn, { maxRetries: 2, initialDelay: 50 })
      const assertion = expect(promise).rejects.toThrow('persistent failure')
      await jest.advanceTimersByTimeAsync(50)

      await assertion
      expect(fn).toHaveBeenCalledTimes(2)
    })

    it('should execute at least once even if maxRetries <= 0', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('error on 0 maxRetries'))
      await expect(retryWithBackoff(fn, { maxRetries: 0 })).rejects.toThrow('error on 0 maxRetries')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should stop retrying if shouldRetry returns false', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Not Found'))
      const shouldRetry = jest.fn((err: unknown) => {
        return !(err instanceof Error && err.message.includes('Not Found'))
      })

      await expect(retryWithBackoff(fn, { maxRetries: 5, shouldRetry })).rejects.toThrow(
        'Not Found',
      )
      expect(fn).toHaveBeenCalledTimes(1)
      expect(shouldRetry).toHaveBeenCalledTimes(1)
    })

    it('should wrap non-Error throws in an Error instance', async () => {
      const fn = jest.fn().mockRejectedValue('raw string rejection')
      await expect(retryWithBackoff(fn, { maxRetries: 1 })).rejects.toThrow('raw string rejection')
    })

    it('should enforce timeout per attempt when timeout option is provided', async () => {
      const slowFn = jest.fn().mockImplementation(() => {
        return new Promise((resolve) => setTimeout(() => resolve('done'), 2000))
      })

      const promise = retryWithBackoff(slowFn, { maxRetries: 1, timeout: 500 })
      const assertion = expect(promise).rejects.toThrow('Operation timed out after 500ms')
      await jest.advanceTimersByTimeAsync(500)

      await assertion
    })
  })
})
