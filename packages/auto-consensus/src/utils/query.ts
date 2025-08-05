/* eslint-disable @typescript-eslint/no-explicit-any */
import { Api } from '@autonomys/auto-utils'

/**
 * Executes a method on the API by traversing the method path dynamically.
 *
 * This utility function allows dynamic execution of API methods by parsing
 * a dot-separated method path and calling the corresponding function on the
 * API object. It's used internally by other functions to provide generic
 * access to RPC calls and storage queries.
 *
 * @param api - The connected API instance
 * @param methodPath - Dot-separated path to the method (e.g., 'rpc.chain.getHeader', 'query.system.account')
 * @param params - Array of parameters to pass to the method
 * @returns Promise that resolves to the method call result
 * @throws Error if the method path is invalid or method execution fails
 *
 * @example
 * ```typescript
 * import { queryMethodPath } from '@autonomys/auto-consensus'
 * import { activate } from '@autonomys/auto-utils'
 *
 * const api = await activate({ networkId: 'mainnet' })
 *
 * // Execute an RPC call
 * const header = await queryMethodPath(api, 'rpc.chain.getHeader', [])
 *
 * // Execute a storage query
 * const totalIssuance = await queryMethodPath(api, 'query.balances.totalIssuance', [])
 *
 * // Execute with parameters
 * const account = await queryMethodPath(api, 'query.system.account', ['address'])
 * ```
 */
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
