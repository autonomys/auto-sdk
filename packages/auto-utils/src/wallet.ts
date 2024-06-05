import { Keyring } from '@polkadot/api'
import type { KeyringPair } from '@polkadot/keyring/types'
import { ed25519PairFromSeed, mnemonicToMiniSecret } from '@polkadot/util-crypto'
import { activate, activateDomain } from './api'
import type { AppName, DomainInput, Mnemonic, MnemonicOrURI, NetworkInput, URI } from './types'

export const setupWallet = (input: MnemonicOrURI) => {
  const keyring = new Keyring({ type: 'sr25519' })

  let pair: KeyringPair
  if ((input as URI).uri) {
    // Treat as as uri
    pair = keyring.addFromUri((input as URI).uri)
  } else if ((input as Mnemonic).mnemonic) {
    // Treat as mnemonic
    const seed = mnemonicToMiniSecret((input as Mnemonic).mnemonic)

    pair = keyring.addFromPair(ed25519PairFromSeed(seed))
  } else throw new Error('Invalid mnemonic or private key')

  return pair
}

export type ActivateWalletInput = (NetworkInput | DomainInput) & MnemonicOrURI & AppName

export const activateWallet = async (input: ActivateWalletInput) => {
  // Create the API instance
  const apiInstance =
    (input as DomainInput).domainId === undefined
      ? await activate(input)
      : await activateDomain(input as DomainInput)

  if (typeof window !== 'undefined') {
    const { web3Enable, web3Accounts } = await import('@polkadot/extension-dapp')

    // Enable Polkadot.js extension in the browser
    await web3Enable(input.appName || 'Auto')

    // Get the list of accounts from the extension
    const allAccounts = await web3Accounts()

    // Attach the first account (or handle multiple accounts as needed)
    if (allAccounts.length > 0) {
      const selectedAccount = allAccounts[0]
      console.log('Connected to account:', selectedAccount.address)
      // You can now use selectedAccount for transactions
    } else {
      console.warn('No accounts found in the Polkadot.js extension')
    }
  } else if ((input as Mnemonic).mnemonic || (input as URI).uri) {
    // Attach the wallet in a node environment
    const account = await setupWallet(input)
    if (account) console.log('Wallet attached:', account.address)
  } else throw new Error('No wallet provided')

  return apiInstance
}
