// file: src/types/wallet.ts

export type Mnemonic = {
  mnemonic: string
}

export type URI = {
  uri: string
}

export type AppName = {
  appName: string
}

export type MnemonicOrURI = Mnemonic | URI
