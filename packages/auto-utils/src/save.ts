export const save = async (key: string, value: any) => {
  // detect if we are in the browser or in node
  if (typeof window !== 'undefined') {
    await saveOnLocalStorage(key, value)
  } else {
    await saveOnFileSystem(key, value)
  }
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
    await fs.writeFile(key, JSON.stringify(value))
  } else throw new Error('This function can only be used in node')
}
