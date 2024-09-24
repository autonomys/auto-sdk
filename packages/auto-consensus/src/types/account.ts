import type { BN } from '@autonomys/auto-utils'
import type { BalanceData, RawBalanceData } from './balance'

export type RawAccountData = {
  nonce: BN
  data: RawBalanceData
}

export type AccountData = {
  nonce: BN
  data: BalanceData
}
