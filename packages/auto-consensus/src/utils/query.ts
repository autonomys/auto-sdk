import { activate, disconnect } from '@autonomys/auto-utils'

export const queryMethodPath = async (
  methodPath: string,
  params: any[] = [],
  networkId?: string,
) => {
  try {
    const api = await activate({ networkId })

    // Split the method path to traverse the api object
    const methodParts = methodPath.split('.')
    let method: any = api
    for (const part of methodParts) {
      method = method[part]
    }

    if (typeof method !== 'function') throw new Error(`Invalid method path: ${methodPath}`)

    const result = await method(...params)

    await disconnect(api)

    return result
  } catch (error) {
    console.error(error)
    throw new Error(`Error querying method path: ${methodPath}`)
  }
}
