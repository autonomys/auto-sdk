export const withRetries = <T>(fn: () => Promise<T>, retries: number, delay: number = 1000) => {
  return new Promise<T>((resolve, reject) => {
    const attempt = async () => {
      try {
        const result = await fn()
        resolve(result)
      } catch (error) {
        if (retries > 0) {
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
