import { OffchainMetadata } from '../metadata/index.js'

export const stringifyMetadata = (metadata: OffchainMetadata): string =>
  JSON.stringify(metadata, (_, v) =>
    typeof v === 'bigint' || v instanceof BigInt ? v.toString() : v,
  )
