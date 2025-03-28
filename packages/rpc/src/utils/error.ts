export const safeExecute = async <T>(fn: () => T | Promise<T>): Promise<T> => {
  try {
    return await fn()
  } catch (error) {
    throw error
  }
}
