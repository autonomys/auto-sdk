// file: src/wallet.ts

import { Keyring } from '@polkadot/api'
import type { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'
import type { KeyringPair } from '@polkadot/keyring/types'
import { mnemonicGenerate } from '@polkadot/util-crypto'
import { address } from './address'
import { activate, activateDomain } from './api'
import { defaultNetwork } from './constants/network'
import { mockURIs } from './constants/wallet'
import type { DomainInput, Mnemonic, MnemonicOrURI, NetworkInput, URI } from './types'
import type {
  ActivateWalletInput,
  ApiPromise,
  GeneratedWallet,
  Wallet,
  WalletActivated,
} from './types/wallet'

export const setupWallet = (params: MnemonicOrURI): Wallet => {
  const keyring = new Keyring({ type: 'sr25519' })

  let keyringPair: Wallet['keyringPair']
  if ((params as URI).uri) {
    // Treat as uri
    keyringPair = keyring.addFromUri((params as URI).uri)
  } else if ((params as Mnemonic).mnemonic) {
    // Treat as mnemonic
    keyringPair = keyring.addFromUri((params as Mnemonic).mnemonic)
  } else throw new Error('Invalid mnemonic or private key')

  return {
    keyringPair,
    address: address(keyringPair.address),
    commonAddress: keyringPair.address,
  }
}

export const generateWallet = (): GeneratedWallet => {
  const mnemonic = mnemonicGenerate()
  const { keyringPair, address, commonAddress } = setupWallet({ mnemonic })

  return {
    mnemonic,
    keyringPair,
    address,
    commonAddress,
  }
}

export const activateWallet = async (params: ActivateWalletInput): Promise<WalletActivated> => {
  if (!params.api) {
    // Create the API instance if not provided
    params.api =
      (params as DomainInput).domainId === undefined
        ? await activate(params)
        : await activateDomain(params as DomainInput)
  }

  const accounts: InjectedAccountWithMeta[] & KeyringPair[] = []

  if ((params as Mnemonic).mnemonic || (params as URI).uri) {
    // Attach the wallet in a node environment
    const { keyringPair } = setupWallet(params)
    if (keyringPair) accounts.push(keyringPair)
  } else if (typeof window !== 'undefined') {
    const { web3Enable, web3Accounts } = await import('@polkadot/extension-dapp')

    // Enable Polkadot.js extension in the browser
    await web3Enable(params.appName || 'Auto')

    // Get the list of accounts from the extension
    const allAccounts = await web3Accounts()
    accounts.push(...allAccounts)
    if (allAccounts.length === 0) console.warn('No accounts found in the Polkadot.js extension')
  } else throw new Error('No wallet provided')

  return { api: params.api, accounts, address: address(accounts[0].address) }
}

export const mockWallets = async (
  network: NetworkInput | DomainInput = { networkId: defaultNetwork.id },
  api?: ApiPromise,
): Promise<WalletActivated[]> => {
  const wallets: WalletActivated[] = []
  for (const uri of mockURIs) {
    const wallet = await activateWallet({
      ...network,
      uri,
      api,
    } as ActivateWalletInput)
    wallets.push(wallet)
  }
  return wallets
}

export const getMockWallet = (name: string, wallets: WalletActivated[]): WalletActivated =>
  wallets[Object.values(mockURIs).indexOf(`//${name}`)]
