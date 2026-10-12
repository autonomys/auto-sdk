export type RetryOptions = {
  maxRetries?: number
  initialDelay?: number
  shouldRetry?: (error: unknown) => boolean
  timeout?: number // Total time in milliseconds before giving up
}

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

export const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  let timeoutId: NodeJS.Timeout

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
  })

  const wrappedPromise = promise.then(
    (result) => {
      clearTimeout(timeoutId)
      return result
    },
    (error) => {
      clearTimeout(timeoutId)
      throw error
    },
  )

  // Prevent unhandled rejection if the underlying promise rejects after the timeout has fired
  wrappedPromise.catch(() => {})

  return Promise.race([wrappedPromise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId)
  })
}

// Retry function with exponential backoff
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  { maxRetries = 5, initialDelay = 1000, shouldRetry = () => true, timeout }: RetryOptions = {},
): Promise<T> => {
  const effectiveMaxRetries = Math.max(1, maxRetries)
  let retries = 0
  let lastError: unknown

  while (retries < effectiveMaxRetries) {
    try {
      return await (timeout !== undefined ? withTimeout(fn(), timeout) : fn())
    } catch (error) {
      lastError = error
      retries++

      if (retries >= effectiveMaxRetries || !shouldRetry(lastError)) {
        break
      }

      const backoffTime = initialDelay * Math.pow(2, retries - 1)
      await delay(backoffTime)
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}
