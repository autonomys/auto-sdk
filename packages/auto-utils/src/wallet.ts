import { Keyring } from '@polkadot/api'
import type { KeyringPair } from '@polkadot/keyring/types'
import { ed25519PairFromSeed, mnemonicToMiniSecret } from '@polkadot/util-crypto'
import { activate, activateDomain } from './api'
import type { DomainInput, NetworkInput } from './types/types'

export const setupWallet = (mnemonicOrPk: string) => {
  const keyring = new Keyring({ type: 'sr25519' })

  let pair: KeyringPair
  if (mnemonicOrPk.startsWith('0x') || mnemonicOrPk.length === 64) {
    // Treat as private key
    const seed = Buffer.from(mnemonicOrPk.replace(/^0x/, ''), 'hex')
    pair = keyring.addFromSeed(seed)
  } else {
    // Treat as mnemonic
    const seed = mnemonicToMiniSecret(mnemonicOrPk)

    const { publicKey, secretKey } = ed25519PairFromSeed(seed)
    pair = keyring.addFromSeed(secretKey)
  }

  return pair
}

export type ActivateWalletInput = (NetworkInput | DomainInput) & {
  mnemonicOrPk?: string
  appName?: string
}

export const activateWallet = async (input: ActivateWalletInput) => {
  // Create the API instance
  const apiInstance =
    (input as any).domainId === undefined
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
  } else if (input.mnemonicOrPk) {
    // Attach the wallet in a node environment
    const account = await setupWallet(input.mnemonicOrPk)
    if (account) console.log('Wallet attached:', account.address)
  } else throw new Error('No wallet provided')

  return apiInstance
}
