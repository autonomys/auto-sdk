import type { ApiPromise } from '@autonomys/auto-utils'

export const remark = async (api: ApiPromise, remark: string, withEvent?: boolean) =>
  !withEvent ? await api.tx.system.remark(remark) : await api.tx.system.remarkWithEvent(remark)
