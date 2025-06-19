export const withRetries = <T>(
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
) => {
  return new Promise<T>((resolve, reject) => {
    const attempt = async () => {
      try {
        const result = await fn()
        resolve(result)
      } catch (error) {
        if (retries > 0) {
          onRetry?.(error as Error, retries)
          await new Promise((resolve) => setTimeout(resolve, delay))
          attempt()
        } else {
          reject(error)
        }
      }
    }
    attempt()
  })
}
