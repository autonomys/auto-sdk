export const save = async (key: string, value: any) => {
  // detect if we are in the browser or in node
  if (typeof window !== 'undefined') await saveOnLocalStorage(key, value)
  else await saveOnFileSystem(key, value)
}

export const saveOnLocalStorage = async (key: string, value: any) => {
  if (typeof window !== 'undefined')
    // save on local storage
    localStorage.setItem(key, JSON.stringify(value))
  else throw new Error('This function can only be used in the browser')
}

export const saveOnFileSystem = async (key: string, value: any) => {
  if (typeof window === 'undefined') {
    // save on file system
    const fs = await import('fs/promises')
    // Check if value is already a string to avoid unnecessary JSON string conversion
    const data = typeof value === 'string' ? value : JSON.stringify(value)
    await fs.writeFile(key, JSON.stringify(data))
  } else throw new Error('This function can only be used in node')
}
