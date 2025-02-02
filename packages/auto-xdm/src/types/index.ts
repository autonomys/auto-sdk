export type Consensus = {
  type: 'consensus'
}
export type Domain = {
  type: 'domain'
  domainId: number
}
export type ChainOrDomain = Consensus | Domain
export type AccountId20 = {
  accountId20: string
}
export type AccountId32 = {
  accountId32: string
}
export type Account = AccountId20 | AccountId32
