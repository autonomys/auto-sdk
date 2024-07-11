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
import type { ActivateWalletInput, GeneratedWallet, Wallet, WalletActivated } from './types/wallet'

export const setupWallet = (input: MnemonicOrURI): Wallet => {
  const keyring = new Keyring({ type: 'sr25519' })

  let keyringPair: Wallet['keyringPair']
  if ((input as URI).uri) {
    // Treat as uri
    keyringPair = keyring.addFromUri((input as URI).uri)
  } else if ((input as Mnemonic).mnemonic) {
    // Treat as mnemonic
    keyringPair = keyring.addFromUri((input as Mnemonic).mnemonic)
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

export const activateWallet = async (input: ActivateWalletInput): Promise<WalletActivated> => {
  // Create the API instance
  const api =
    (input as DomainInput).domainId === undefined
      ? await activate(input)
      : await activateDomain(input as DomainInput)

  const accounts: InjectedAccountWithMeta[] & KeyringPair[] = []

  if ((input as Mnemonic).mnemonic || (input as URI).uri) {
    // Attach the wallet in a node environment
    const { keyringPair } = setupWallet(input)
    if (keyringPair) accounts.push(keyringPair)
  } else if (typeof window !== 'undefined') {
    const { web3Enable, web3Accounts } = await import('@polkadot/extension-dapp')

    // Enable Polkadot.js extension in the browser
    await web3Enable(input.appName || 'Auto')

    // Get the list of accounts from the extension
    const allAccounts = await web3Accounts()
    accounts.push(...allAccounts)
    if (allAccounts.length === 0) console.warn('No accounts found in the Polkadot.js extension')
  } else throw new Error('No wallet provided')

  return { api, accounts, address: address(accounts[0].address) }
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
