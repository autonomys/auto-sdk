export const safeExecute = async <T>(fn: () => T | Promise<T>): Promise<T> => {
  return await fn()
}
