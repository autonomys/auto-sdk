import type { BN } from '@autonomys/auto-utils'

export type RawBalanceData = {
  free: BN
  reserved: BN
  frozen: BN
  flags: BN
}

export type BalanceData = {
  free: bigint
  reserved: bigint
  frozen: bigint
}
