// file: src/types/wallet.ts

import type { ApiPromise } from '@polkadot/api'
import type { AddressOrPair, Signer, SignerResult } from '@polkadot/api/types'
import type { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'
import type { KeyringPair } from '@polkadot/keyring/types'
import type { DomainInput, NetworkInput } from './network'

export type Mnemonic = {
  mnemonic: string
}

export type URI = {
  uri: string
}

export type ExtraActivationOptions = {
  appName?: string
  api?: ApiPromise
}

export type MnemonicOrURI = Mnemonic | URI

export type Wallet = {
  keyringPair?: KeyringPair
  injectedAccount?: InjectedAccountWithMeta
  address: string
  commonAddress: string
}

export interface GeneratedWallet extends Wallet {
  mnemonic: string
}

export type ActivateWalletInput = (NetworkInput | DomainInput) &
  MnemonicOrURI &
  ExtraActivationOptions

export type WalletActivated = {
  api: ApiPromise
  accounts: InjectedAccountWithMeta[] & KeyringPair[]
  address: string
}

export type {
  AddressOrPair,
  ApiPromise,
  InjectedAccountWithMeta,
  KeyringPair,
  Signer,
  SignerResult,
}
