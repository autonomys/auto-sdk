import type { Actions } from '@/types/action'

export const actions: Actions = [
  {
    name: 'Address',
    inputs: ['string'],
  },
  {
    name: 'BalanceOf',
    inputs: ['string'],
  },
  {
    name: 'Transfer',
    inputs: ['string', 'Amount'],
  },
  {
    name: 'TotalIssuance',
  },
]

export const defaultAction = actions[1]
