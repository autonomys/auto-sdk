// file: src/wallet.ts

import type { ApiPromise } from '@polkadot/api'
import { Keyring } from '@polkadot/api'
import type { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'
import type { KeyringPair } from '@polkadot/keyring/types'
import { cryptoWaitReady } from '@polkadot/util-crypto'
import { activate, activateDomain } from './api'
import { defaultNetwork } from './constants/network'
import { mockURIs } from './constants/wallet'
import type { AppName, DomainInput, Mnemonic, MnemonicOrURI, NetworkInput, URI } from './types'

export const setupWallet = async (input: MnemonicOrURI): Promise<KeyringPair> => {
  await cryptoWaitReady()
  const keyring = new Keyring({ type: 'sr25519' })

  let pair: KeyringPair
  if ((input as URI).uri) {
    // Treat as uri
    pair = keyring.addFromUri((input as URI).uri)
  } else if ((input as Mnemonic).mnemonic) {
    // Treat as mnemonic
    pair = keyring.addFromUri((input as Mnemonic).mnemonic)
  } else throw new Error('Invalid mnemonic or private key')

  return pair
}

export type ActivateWalletInput = (NetworkInput | DomainInput) & MnemonicOrURI & AppName
export type WalletActivated = {
  api: ApiPromise
  accounts: InjectedAccountWithMeta[] & KeyringPair[]
}

export const activateWallet = async (input: ActivateWalletInput): Promise<WalletActivated> => {
  // Create the API instance
  const api =
    (input as DomainInput).domainId === undefined
      ? await activate(input)
      : await activateDomain(input as DomainInput)

  const accounts: InjectedAccountWithMeta[] & KeyringPair[] = []

  if ((input as Mnemonic).mnemonic || (input as URI).uri) {
    // Attach the wallet in a node environment
    const account = await setupWallet(input)
    accounts.push(account)
  } else if (typeof window !== 'undefined') {
    const { web3Enable, web3Accounts } = await import('@polkadot/extension-dapp')

    // Enable Polkadot.js extension in the browser
    await web3Enable(input.appName || 'Auto')

    // Get the list of accounts from the extension
    const allAccounts = await web3Accounts()
    accounts.push(...allAccounts)
    if (allAccounts.length === 0) console.warn('No accounts found in the Polkadot.js extension')
  } else throw new Error('No wallet provided')

  return { api, accounts }
}

export const mockWallets = async (
  network: NetworkInput | DomainInput = { networkId: defaultNetwork.id },
): Promise<WalletActivated[]> =>
  await Promise.all(
    mockURIs.map((uri) =>
      activateWallet({
        ...network,
        uri,
      } as ActivateWalletInput),
    ),
  )

export const getMockWallet = (name: string, wallets: WalletActivated[]): WalletActivated =>
  wallets[Object.values(mockURIs).indexOf(`//${name}`)]
