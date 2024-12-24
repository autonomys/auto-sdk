export type SubscriptionGranularity = 'monthly'

export type SubscriptionInfo = {
  id: string
  organizationId: string
  uploadLimit: number
  downloadLimit: number
  granularity: SubscriptionGranularity
  pendingUploadCredits: number
  pendingDownloadCredits: number
}

export enum UserRole {
  User = 'User',
  Admin = 'Admin',
}

export type User = {
  oauthProvider: string
  oauthUserId: string
  role: UserRole
  downloadCredits: number
  uploadCredits: number
  publicId: string
  onboarded: true
}

export type UserInfo = {
  user: User
  subscription: SubscriptionInfo
}
