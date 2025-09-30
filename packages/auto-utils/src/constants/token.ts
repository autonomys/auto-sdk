export const DEFAULT_TOKEN_DECIMALS = 18

export const DEFAULT_TOKEN_SYMBOL = 'AI3'

export const DEFAULT_TOKEN_NAME = 'Auto Token'

// Existential deposit for Autonomys Network consensus chain
export const DEFAULT_CONSENSUS_EXISTENTIAL_DEPOSIT_SHANNONS = BigInt(10000000000000) // 0.00001 AI3

// Existential deposit for Autonomys Network domains/EVM
export const DEFAULT_DOMAIN_EXISTENTIAL_DEPOSIT_SHANNONS = BigInt(1000000000000) // 0.000001 AI3

export const DEFAULT_TOKEN = {
  decimals: DEFAULT_TOKEN_DECIMALS,
  symbol: DEFAULT_TOKEN_SYMBOL,
  name: DEFAULT_TOKEN_NAME,
}

export const TESTNET_TOKEN = {
  ...DEFAULT_TOKEN,
  symbol: 't' + DEFAULT_TOKEN_SYMBOL,
  name: 'Testnet ' + DEFAULT_TOKEN_NAME,
}
