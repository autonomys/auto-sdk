import type { ApiPromise } from '@autonomys/auto-utils'

export const remark = (api: ApiPromise, remark: string, withEvent?: boolean) =>
  !withEvent ? api.tx.system.remark(remark) : api.tx.system.remarkWithEvent(remark)
