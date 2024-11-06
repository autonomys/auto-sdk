export const DEFAULT_TOKEN_DECIMALS = 18

export const DEFAULT_TOKEN_SYMBOL = 'AI3'

export const DEFAULT_TOKEN_NAME = 'Auto Token'

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
