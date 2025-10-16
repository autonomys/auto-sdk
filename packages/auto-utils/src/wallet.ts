// file: src/wallet.ts

import { Keyring } from '@polkadot/api'
import type { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'
import type { KeyringPair } from '@polkadot/keyring/types'
import { mnemonicGenerate } from '@polkadot/util-crypto'
import { address } from './address'
import { activate, activateDomain } from './api'
import { defaultNetwork } from './constants/network'
import { mockURIs } from './constants/wallet'
import type { DomainParams, Mnemonic, NetworkParams, URI } from './types'
import type {
  ActivateWalletParams,
  ApiPromise,
  GeneratedWallet,
  KeypairType,
  SetupWalletParams,
  Wallet,
  WalletActivated,
} from './types/wallet'

/**
 * Sets up a wallet from a mnemonic phrase or derivation URI.
 *
 * This function creates a KeyringPair from either a mnemonic phrase or a derivation
 * URI (like //Alice for development). It supports different key types including
 * sr25519 (default) and ethereum for cross-chain compatibility.
 *
 * @param params - Wallet setup parameters containing either mnemonic or URI, plus optional key type.
 * @returns A Wallet object containing the KeyringPair and standardized addresses.
 *
 * @example
 * import { setupWallet } from '@autonomys/auto-utils'
 *
 * // Setup wallet from mnemonic (sr25519 default)
 * const wallet = setupWallet({
 *   mnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
 * })
 * console.log(wallet.address) // Standardized Autonomys address
 * console.log(wallet.commonAddress) // Original address format
 *
 * // Setup wallet with ethereum key type
 * const ethWallet = setupWallet({
 *   mnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
 *   type: 'ethereum'
 * })
 * console.log(ethWallet.address) // Ethereum-format address (0x...)
 *
 * // Setup ethereum wallet with BIP44 derivation path
 * const ethBip44 = setupWallet({
 *   mnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
 *   type: 'ethereum',
 *   derivationPath: "m/44'/60'/0'/0/0",
 * })
 * console.log(ethBip44.address) // Matches MetaMask default derivation
 *
 * // Setup development wallet from URI
 * const aliceWallet = setupWallet({ uri: '//Alice' })
 * console.log(aliceWallet.address) // Alice's development address
 *
 * // Setup with custom derivation path
 * const customWallet = setupWallet({
 *   uri: '//Alice/stash'
 * })
 *
 * @throws {Error} When neither mnemonic nor URI is provided, or when the input is invalid.
 */
export const setupWallet = (params: SetupWalletParams): Wallet => {
  const type = params.type || 'sr25519'
  const keyring = new Keyring({ type })

  let keyringPair: Wallet['keyringPair']
  if ((params as URI).uri) {
    // Treat as uri
    keyringPair = keyring.addFromUri((params as URI).uri)
  } else if ((params as Mnemonic).mnemonic) {
    // Treat as mnemonic
    const base = (params as Mnemonic).mnemonic
    const withPath = params.derivationPath ? `${base}/${params.derivationPath}` : base
    keyringPair = keyring.addFromUri(withPath)
  } else throw new Error('Invalid mnemonic or private key')

  return {
    keyringPair,
    address: type === 'sr25519' ? address(keyringPair.address) : keyringPair.address,
    commonAddress: keyringPair.address,
  }
}

/**
 * Generates a new wallet with a random mnemonic phrase.
 *
 * This function creates a brand new wallet by generating a cryptographically secure
 * mnemonic phrase and deriving the corresponding KeyringPair. It's useful for creating
 * new user accounts or generating test wallets.
 *
 * @param type - The cryptographic key type to use. Defaults to 'sr25519'.
 * @returns A GeneratedWallet object containing the mnemonic, KeyringPair, and addresses.
 *
 * @example
 * import { generateWallet } from '@autonomys/auto-utils'
 *
 * // Generate new sr25519 wallet (default)
 * const newWallet = generateWallet()
 * console.log(newWallet.mnemonic) // 12-word mnemonic phrase
 * console.log(newWallet.address) // Standardized Autonomys address
 * console.log(newWallet.commonAddress) // Original address format
 *
 * // Generate ethereum-compatible wallet
 * const ethWallet = generateWallet('ethereum')
 * console.log(ethWallet.mnemonic) // Same 12-word mnemonic
 * console.log(ethWallet.address) // Ethereum-format address (0x...)
 *
 * // Store the mnemonic securely for later use
 * const mnemonic = newWallet.mnemonic
 * // Use setupWallet later to recreate the same wallet
 * const restoredWallet = setupWallet({ mnemonic })
 * console.log(restoredWallet.address === newWallet.address) // true
 */
export const generateWallet = (type: KeypairType = 'sr25519'): GeneratedWallet => {
  const mnemonic = mnemonicGenerate()
  const { keyringPair, address, commonAddress } = setupWallet({ mnemonic, type })

  return {
    mnemonic,
    keyringPair,
    address,
    commonAddress,
  }
}

/**
 * Activates a wallet and establishes connection to the Autonomys Network or domain.
 *
 * This comprehensive function handles wallet activation in both Node.js and browser
 * environments. It can work with mnemonic phrases, URIs, or browser extensions,
 * and automatically establishes the appropriate API connection.
 *
 * @param params - Wallet activation parameters including credentials, network, and options.
 * @returns A WalletActivated object containing the API connection and account information.
 *
 * @example
 * import { activateWallet } from '@autonomys/auto-utils'
 *
 * // Activate wallet with mnemonic on mainnet
 * const { api, accounts } = await activateWallet({
 *   mnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
 * })
 * console.log('Connected to mainnet')
 * console.log('Account address:', accounts[0].address)
 *
 * // Activate on specific network
 * const { api: mainnetApi, accounts: mainnetAccounts } = await activateWallet({
 *   mnemonic: 'your mnemonic here',
 *   networkId: 'mainnet'
 * })
 *
 * // Activate on domain
 * const { api: domainApi, accounts: domainAccounts } = await activateWallet({
 *   uri: '//Alice',
 *   networkId: 'mainnet',
 *   domainId: '0' // Auto-EVM domain
 * })
 *
 * // Activate with ethereum key type
 * const { api: ethApi, accounts: ethAccounts } = await activateWallet({
 *   mnemonic: 'your mnemonic here',
 *   networkId: 'mainnet',
 *   type: 'ethereum'
 * })
 *
 * // Use with existing API instance
 * import { activate } from '@autonomys/auto-utils'
 * const existingApi = await activate({ networkId: 'mainnet' })
 * const { accounts } = await activateWallet({
 *   uri: '//Bob',
 *   api: existingApi
 * })
 *
 * // Always disconnect when done
 * await api.disconnect()
 *
 * @throws {Error} When no wallet credentials are provided or connection fails.
 */
export const activateWallet = async (params: ActivateWalletParams): Promise<WalletActivated> => {
  if (!params.api) {
    // Create the API instance if not provided
    params.api =
      (params as DomainParams).domainId === undefined
        ? await activate(params)
        : await activateDomain(params as DomainParams)
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

  return {
    api: params.api,
    accounts,
    address:
      params.type && params.type === 'ethereum'
        ? accounts[0].address
        : address(accounts[0].address),
  }
}

/**
 * Creates a collection of mock wallets for testing and development purposes.
 *
 * This function generates wallets for all predefined development accounts
 * (Alice, Bob, Charlie, Dave, etc.) and establishes connections to the specified
 * network. It's essential for testing applications and running development scenarios.
 *
 * @param network - Network parameters specifying which network to connect to. Defaults to mainnet.
 * @param api - Optional existing API instance to reuse. If not provided, creates new connections.
 * @param type - The cryptographic key type to use for all mock wallets. Defaults to 'sr25519'.
 * @returns Promise resolving to an array of WalletActivated objects for all mock accounts.
 *
 * @example
 * import { mockWallets, activate } from '@autonomys/auto-utils'
 *
 * // Create mock wallets for mainnet
 * const wallets = await mockWallets()
 * console.log('Created', wallets.length, 'mock wallets')
 *
 * // Create mock wallets for testnet
 * const testWallets = await mockWallets({ networkId: 'mainnet' })
 *
 * // Create mock wallets with existing API
 * const api = await activate({ networkId: 'localhost' })
 * const localWallets = await mockWallets({ networkId: 'localhost' }, api)
 *
 * // Create ethereum-type mock wallets
 * const ethWallets = await mockWallets(
 *   { networkId: 'mainnet' },
 *   undefined,
 *   'ethereum'
 * )
 *
 * // Use specific mock wallet
 * const aliceWallet = wallets[0] // Alice is always first
 * const bobWallet = wallets[1]   // Bob is always second
 *
 * // Access wallet details
 * console.log('Alice address:', aliceWallet.accounts[0].address)
 * console.log('Bob address:', bobWallet.accounts[0].address)
 *
 * // Disconnect all APIs when done
 * for (const wallet of wallets) {
 *   await wallet.api.disconnect()
 * }
 */
export const mockWallets = async (
  network: NetworkParams | DomainParams = { networkId: defaultNetwork.id },
  api?: ApiPromise,
  type?: KeypairType,
): Promise<WalletActivated[]> => {
  if (!type) type = 'sr25519'
  const wallets: WalletActivated[] = []
  for (const uri of mockURIs) {
    const wallet = await activateWallet({
      ...network,
      uri,
      api,
      type,
    } as ActivateWalletParams)
    wallets.push(wallet)
  }
  return wallets
}

/**
 * Retrieves a specific mock wallet by name from a collection of mock wallets.
 *
 * This utility function provides easy access to specific development accounts
 * by name, making test code more readable and maintainable. It works with the
 * standard set of development account names.
 *
 * @param name - The name of the mock wallet to retrieve (e.g., 'Alice', 'Bob').
 * @param wallets - Array of WalletActivated objects from mockWallets().
 * @returns The WalletActivated object for the specified mock account.
 *
 * @example
 * import { mockWallets, getMockWallet } from '@autonomys/auto-utils'
 *
 * // Create mock wallets and get specific ones
 * const wallets = await mockWallets({ networkId: 'localhost' })
 *
 * const alice = getMockWallet('Alice', wallets)
 * const bob = getMockWallet('Bob', wallets)
 * const charlie = getMockWallet('Charlie', wallets)
 *
 * console.log('Alice address:', alice.accounts[0].address)
 * console.log('Bob address:', bob.accounts[0].address)
 * console.log('Charlie address:', charlie.accounts[0].address)
 *
 * // Use in tests
 * const sender = getMockWallet('Alice', wallets)
 * const receiver = getMockWallet('Bob', wallets)
 *
 * // Perform transfer from Alice to Bob
 * // ... transfer logic here ...
 *
 * // Available mock wallet names:
 * // 'Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Frank', 'Grace', 'Harry', 'Ivy', 'Jacob'
 *
 * @throws {Error} When the specified name is not found in the available mock wallets.
 */
export const getMockWallet = (name: string, wallets: WalletActivated[]): WalletActivated =>
  wallets[Object.values(mockURIs).indexOf(`//${name}`)]
