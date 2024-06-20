export type Wallet = {
  name: string
  uri: string
}

export type Wallets = Wallet[]

export interface WalletSigner extends Wallet {
  accounts: any[]
  api: any
}

export type WalletsSigners = WalletSigner[]
