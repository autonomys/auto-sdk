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
  for (let pendingRetries = retries; ; pendingRetries--) {
    try {
      return await fn()
    } catch (error) {
      if (pendingRetries <= 0) {
        throw error
      }
      onRetry?.(error as Error, pendingRetries)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
}
