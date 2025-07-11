import type { Api } from '@autonomys/auto-utils'
import type { ApiPromise } from '@polkadot/api'
import type { Option, Raw } from '@polkadot/types'
import { u8aToBigInt } from '@polkadot/util'

/**
 * Reads operator epoch share price from storage, handling both Perbill and Perquintill formats.
 *
 * This function uses raw storage queries to bypass type decoding issues when the runtime
 * has been upgraded but historical data remains in the old format.
 *
 * NOTE: Supporting Perbill is only necessary to support Taurus. Once Taurus is deprecated, this wrapper around raw storage can be removed and the standard query can be used.
 *
 * @param api - The API instance
 * @param operatorId - The operator ID
 * @param domainId - The domain ID
 * @param domainEpoch - The domain epoch
 * @returns The share price in Perquintill format (18 decimals) or undefined
 */
export const getOperatorEpochSharePrice = async (
  api: Api,
  operatorId: string | number | bigint,
  domainId: string | number | bigint,
  domainEpoch: string | number | bigint,
): Promise<bigint | undefined> => {
  try {
    // Get storage key
    const storageKey = api.query.domains.operatorEpochSharePrice.key(operatorId, [
      domainId,
      domainEpoch,
    ])

    // Get raw storage value
    const rawResult = await (api as ApiPromise).rpc.state.getStorage(storageKey)

    // Type assertion for Option<Raw>
    const rawOption = rawResult as Option<Raw>

    if (!rawOption || rawOption.isNone) {
      return undefined
    }

    // Convert to bytes
    const rawBytes = rawOption.unwrap().toU8a()

    if (rawBytes.length === 0) {
      return undefined
    }

    // Parse as little-endian bigint
    const value = u8aToBigInt(rawBytes, { isLe: true })

    // Handle both formats based on byte length
    if (rawBytes.length === 4) {
      // Old Perbill format (4 bytes, parts per billion)
      // Scale from 9 to 18 decimals: multiply by 10^9
      return value * BigInt(1000000000)
    } else if (rawBytes.length === 8) {
      // New Perquintill format (8 bytes, parts per quintillion)
      return value
    } else {
      console.warn(
        `Unexpected share price storage length: ${rawBytes.length} bytes for operator ${operatorId}, domain ${domainId}, epoch ${domainEpoch}`,
      )
      return undefined
    }
  } catch (error) {
    console.error(
      `Error reading operator epoch share price from storage for operator ${operatorId}, domain ${domainId}, epoch ${domainEpoch}:`,
      error,
    )
    return undefined
  }
}
