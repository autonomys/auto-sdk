// file: src/types/wallet.ts

import type { ApiPromise } from '@polkadot/api'
import type { AddressOrPair, ApiDecoration, Signer, SignerResult } from '@polkadot/api/types'
import type { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'
import type { KeyringPair } from '@polkadot/keyring/types'
import type { KeypairType } from '@polkadot/util-crypto/types'
import type { DomainParams, NetworkParams } from './network'

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

export type WalletType = {
  type?: KeypairType
}

export type SetupWalletParams = MnemonicOrURI &
  WalletType & {
    derivationPath?: string
  }

export type Wallet = {
  keyringPair?: KeyringPair
  injectedAccount?: InjectedAccountWithMeta
  address: string
  commonAddress: string
}

export interface GeneratedWallet extends Wallet {
  mnemonic: string
}

export type ActivateWalletParams = (NetworkParams | DomainParams) &
  MnemonicOrURI &
  ExtraActivationOptions &
  WalletType & {
    derivationPath?: string
  }

export type WalletActivated = {
  api: ApiPromise
  accounts: InjectedAccountWithMeta[] & KeyringPair[]
  address: string
}

export type ApiAtBlockHash = ApiDecoration<'promise'>

export type Api = ApiPromise | ApiAtBlockHash

export type {
  AddressOrPair,
  ApiDecoration,
  ApiPromise,
  InjectedAccountWithMeta,
  KeypairType,
  KeyringPair,
  Signer,
  SignerResult,
}
