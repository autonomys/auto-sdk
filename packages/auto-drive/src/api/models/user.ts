export type AccountModel = 'monthly' | 'one_off'

export type SubscriptionGranularity = AccountModel

export type SubscriptionInfo = {
  id: string
  organizationId: string
  uploadLimit: number
  downloadLimit: number
  granularity: SubscriptionGranularity
  pendingUploadCredits: number
  pendingDownloadCredits: number
}

/** The authenticated account, as `GET /accounts/@me` returns it. */
export type AccountInfo = {
  id: string
  organizationId: string
  uploadLimit: number
  downloadLimit: number
  model: AccountModel
  isPartner: boolean
  maxPurchasedBytes: number | null
  creditExpiryDays: number | null
  pendingUploadCredits: number
  pendingDownloadCredits: number
}
