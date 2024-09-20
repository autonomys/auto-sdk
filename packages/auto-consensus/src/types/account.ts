import type { BN } from '@autonomys/auto-utils'
import type { RawBalanceData } from './balance'

export type AccountData = {
  nonce: BN
  data: RawBalanceData
}
