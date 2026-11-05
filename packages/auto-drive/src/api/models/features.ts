/**
 * Dynamic feature flags configuration returned by the Auto Drive service.
 * Used by clients to check feature availability (e.g. storage credit purchases, USDC payments).
 */
export type FeatureFlags = {
  /** Whether purchasing credits (via AI3) is enabled */
  buyCredits?: boolean
  /** Whether paying for credits with USDC is offered and available to the caller */
  payWithUsdc?: boolean
  /** Whether USDC payments are currently accepted by the deployment (independent of user role) */
  usdcAvailable?: boolean
  /** Additional server-defined feature flags */
  [key: string]: boolean | undefined
}
