export enum BannerCriticality {
  Info = 'info',
  Warning = 'warning',
  Critical = 'critical',
}

export enum BannerInteractionType {
  Acknowledged = 'acknowledged',
  Dismissed = 'dismissed',
}

export type Banner = {
  id: string
  title: string
  body: string
  criticality: BannerCriticality
  dismissable: boolean
  requiresAcknowledgement: boolean
  displayStart: string
  displayEnd: string | null
  active: boolean
  createdBy?: string
  createdAt: string
  updatedAt: string
}
