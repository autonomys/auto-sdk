export const read = async (key: string) => {
  // detect if we are in the browser or in node
  if (typeof window !== 'undefined') return readFromLocalStorage(key)
  else return readFromFileSystem(key)
}

export const readFromLocalStorage = async (key: string) => {
  if (typeof window !== 'undefined') {
    // read from local storage
    const value = localStorage.getItem(key)
    try {
      return value ? JSON.parse(value) : null
    } catch (error) {
      throw new Error('Failed to parse data from localStorage: ' + error)
    }
  } else throw new Error('This function can only be used in the browser')
}

export const readFromFileSystem = async (key: string) => {
  if (typeof window === 'undefined') {
    // read from file system
    const fs = await import('node:fs/promises')
    try {
      const data = await fs.readFile(key, { encoding: 'utf-8' })
      return JSON.parse(data)
    } catch (error) {
      throw new Error('Failed to read or parse file: ' + error)
    }
  } else throw new Error('This function can only be used in node')
}
