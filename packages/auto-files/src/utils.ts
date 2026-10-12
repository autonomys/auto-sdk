export const withRetries = async <T>(
  fn: () => Promise<T>,
  {
    retries = 3,
    delay = 1000,
    onRetry,
  }: {
    retries?: number
    delay?: number
    onRetry?: (error: Error, pendingRetries: number) => void
  } = {},
): Promise<T> => {
  const maxRetries = Number.isFinite(retries) ? Math.max(0, Math.floor(retries)) : 0
  const retryDelay = Number.isFinite(delay) ? Math.max(0, delay) : 0

  for (let pendingRetries = maxRetries; ; pendingRetries--) {
    try {
      return await fn()
    } catch (error) {
      if (pendingRetries <= 0) {
        throw error
      }
      const err = error instanceof Error ? error : new Error(String(error))
      onRetry?.(err, pendingRetries)
      await new Promise((resolve) => setTimeout(resolve, retryDelay))
    }
  }
}
