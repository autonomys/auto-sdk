export const unresolvablePromise = new Promise<void>(() => {})

export const schedule = setTimeout

export const randomId = () => Math.floor(Math.random() * 65535)
