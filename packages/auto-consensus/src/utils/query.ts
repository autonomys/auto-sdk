import { Api } from '@autonomys/auto-utils'

export const queryMethodPath = async <T>(
  api: Api,
  methodPath: string,
  params: any[] = [],
): Promise<T> => {
  try {
    // Split the method path to traverse the api object
    const methodParts = methodPath.split('.')
    let method: any = api
    for (const part of methodParts) {
      method = method[part]
    }

    if (typeof method !== 'function') throw new Error(`Invalid method path: ${methodPath}`)

    return (await method(...params)) as Promise<T>
  } catch (error) {
    console.error(error)
    throw new Error(`Error querying method path: ${methodPath}`)
  }
}
