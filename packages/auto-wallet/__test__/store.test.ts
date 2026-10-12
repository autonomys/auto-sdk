import {
  getWallets,
  getWalletBySource,
  type Wallet,
  type WalletAccount,
} from '@talismn/connect-wallets'
import type { InjectedExtension } from '@polkadot/extension-inject/types'
import { createWalletStore } from '../src/store'
import { DEFAULT_WALLET_CONFIG } from '../src/constants'
import { connectToWallet } from '../src/connect'

jest.mock('@talismn/connect-wallets', () => ({
  getWallets: jest.fn(),
  getWalletBySource: jest.fn(),
}))

jest.mock('../src/connect', () => ({
  connectToWallet: jest.fn(),
}))
const mockStorage = new Map<string, string>()
const mockLocalStorage: Storage = {
  getItem: jest.fn((key: string) => mockStorage.get(key) ?? null),
  setItem: jest.fn((key: string, value: string) => {
    mockStorage.set(key, value)
  }),
  removeItem: jest.fn((key: string) => {
    mockStorage.delete(key)
  }),
  clear: jest.fn(() => {
    mockStorage.clear()
  }),
  key: jest.fn((index: number) => Array.from(mockStorage.keys())[index] ?? null),
  get length() {
    return mockStorage.size
  },
}
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
})
Object.defineProperty(global, 'window', {
  value: { localStorage: mockLocalStorage },
  writable: true,
})

describe('createWalletStore', () => {
  const mockExtension = {
    name: 'talisman',
    version: '1.0.0',
    accounts: { get: jest.fn(), subscribe: jest.fn() },
    signer: {},
  } as unknown as InjectedExtension

  const mockAccount1: WalletAccount = {
    address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    name: 'Alice',
    source: 'talisman',
  }

  const mockAccount2: WalletAccount = {
    address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
    name: 'Bob',
    source: 'talisman',
  }

  const createMockWallet = (extensionName: string, title: string, installed = true): Wallet => {
    return {
      extensionName,
      title,
      installed,
      extension: mockExtension,
      enable: jest.fn(),
      getAccounts: jest.fn(),
    } as unknown as Wallet
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.clearAllTimers()
    mockStorage.clear()
    ;(getWallets as jest.Mock).mockReturnValue([])
    ;(getWalletBySource as jest.Mock).mockReturnValue(undefined)
  })

  afterEach(() => {
    jest.clearAllTimers()
    mockStorage.clear()
  })

  describe('Configuration & Initialization', () => {
    it('should initialize with default configuration when no config is provided', () => {
      const store = createWalletStore()
      const state = store.getState()

      expect(state.config.dappName).toBe(DEFAULT_WALLET_CONFIG.dappName)
      expect(state.config.ss58Prefix).toBe(DEFAULT_WALLET_CONFIG.ss58Prefix)
      expect(state.config.storageKey).toBe(DEFAULT_WALLET_CONFIG.storageKey)
      expect(state.config.supportedWallets).toEqual(DEFAULT_WALLET_CONFIG.supportedWallets)
      expect(state.isConnected).toBe(false)
      expect(state.isLoading).toBe(false)
      expect(state.loadingType).toBeNull()
      expect(state.connectionError).toBeNull()
      expect(state.selectedWallet).toBeNull()
      expect(state.selectedAccount).toBeNull()
      expect(state.accounts).toEqual([])
      expect(state.availableWallets).toEqual([])
    })

    it('should deep merge custom configuration including installUrls', () => {
      const store = createWalletStore({
        dappName: 'Custom App',
        ss58Prefix: 42,
        installUrls: {
          talisman: 'https://custom.talisman.url',
        },
      })
      const state = store.getState()

      expect(state.config.dappName).toBe('Custom App')
      expect(state.config.ss58Prefix).toBe(42)
      expect(state.config.installUrls.talisman).toBe('https://custom.talisman.url')
      expect(state.config.installUrls['subwallet-js']).toBe(
        DEFAULT_WALLET_CONFIG.installUrls['subwallet-js'],
      )
      expect(state.config.installUrls['polkadot-js']).toBe(
        DEFAULT_WALLET_CONFIG.installUrls['polkadot-js'],
      )
    })
  })

  describe('detectWallets', () => {
    it('should discover supported wallets and filter out Nova and duplicates', () => {
      const talismanWallet = createMockWallet('talisman', 'Talisman')
      const novaWallet = createMockWallet('polkadot-js', 'Nova Wallet')
      const polkadotWallet = createMockWallet('polkadot-js', 'Polkadot{.js}')
      const duplicatePolkadot = createMockWallet('polkadot-js', 'Polkadot{.js} Copy')
      const unsupportedWallet = createMockWallet('unsupported-wallet', 'Unsupported')

      ;(getWallets as jest.Mock).mockReturnValue([
        talismanWallet,
        novaWallet,
        polkadotWallet,
        duplicatePolkadot,
        unsupportedWallet,
      ])

      const store = createWalletStore()
      store.getState().detectWallets()

      const { availableWallets } = store.getState()
      expect(availableWallets).toHaveLength(2)
      expect(availableWallets).toContain(talismanWallet)
      expect(availableWallets).toContain(polkadotWallet)
      expect(availableWallets).not.toContain(novaWallet)
      expect(availableWallets).not.toContain(unsupportedWallet)
    })

    it('should catch errors from getWallets and set availableWallets to empty array', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
      ;(getWallets as jest.Mock).mockImplementation(() => {
        throw new Error('Detection failed')
      })

      const store = createWalletStore()
      store.getState().detectWallets()

      expect(store.getState().availableWallets).toEqual([])
      expect(warnSpy).toHaveBeenCalledWith('Failed to detect wallets:', expect.any(Error))
      warnSpy.mockRestore()
    })
  })

  describe('connectWallet', () => {
    it('should throw an error if a connection is already in progress', async () => {
      const store = createWalletStore()
      store.setState({ isLoading: true })

      await expect(store.getState().connectWallet('talisman')).rejects.toThrow(
        'Connection already in progress',
      )
    })

    it('should successfully connect wallet and update state', async () => {
      const talismanWallet = createMockWallet('talisman', 'Talisman')
      ;(connectToWallet as jest.Mock).mockResolvedValue({
        accounts: [mockAccount1, mockAccount2],
        injector: mockExtension,
        wallet: talismanWallet,
      })

      const store = createWalletStore()
      store.setState({ availableWallets: [talismanWallet] })

      await store.getState().connectWallet('talisman')

      const state = store.getState()
      expect(connectToWallet).toHaveBeenCalledWith('talisman', state.config, talismanWallet)
      expect(state.isConnected).toBe(true)
      expect(state.isLoading).toBe(false)
      expect(state.loadingType).toBeNull()
      expect(state.selectedWallet).toBe('talisman')
      expect(state.selectedAccount).toEqual(mockAccount1)
      expect(state.accounts).toEqual([mockAccount1, mockAccount2])
      expect(state.injector).toBe(mockExtension)
      expect(state.connectionError).toBeNull()
    })

    it('should handle connection failure and update connectionError', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      ;(connectToWallet as jest.Mock).mockRejectedValue(new Error('Extension rejected'))

      const store = createWalletStore()

      await expect(store.getState().connectWallet('talisman')).rejects.toThrow('Extension rejected')

      const state = store.getState()
      expect(state.isConnected).toBe(false)
      expect(state.isLoading).toBe(false)
      expect(state.loadingType).toBeNull()
      expect(state.connectionError).toBe('Extension rejected')

      errorSpy.mockRestore()
    })

    it('should discard connection result if sequence changed before completion', async () => {
      let resolveConnection: (val: unknown) => void
      ;(connectToWallet as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveConnection = resolve
          }),
      )

      const store = createWalletStore()
      const connectPromise = store.getState().connectWallet('talisman')

      // User disconnects while connection is in-flight, incrementing sequence
      store.getState().disconnectWallet()

      resolveConnection!({
        accounts: [mockAccount1],
        injector: mockExtension,
        wallet: createMockWallet('talisman', 'Talisman'),
      })

      await connectPromise

      const state = store.getState()
      expect(state.isConnected).toBe(false)
      expect(state.selectedWallet).toBeNull()
    })
  })

  describe('initializeConnection', () => {
    it('should skip initialization if isLoading is true', async () => {
      const store = createWalletStore()
      store.setState({
        isLoading: true,
        selectedWallet: 'talisman',
        selectedAccount: mockAccount1,
      })

      await store.getState().initializeConnection()
      expect(connectToWallet).not.toHaveBeenCalled()
    })

    it('should skip initialization if already connected or no persisted wallet/account', async () => {
      const store = createWalletStore()
      store.setState({
        isConnected: true,
        selectedWallet: 'talisman',
        selectedAccount: mockAccount1,
      })

      await store.getState().initializeConnection()
      expect(connectToWallet).not.toHaveBeenCalled()

      store.setState({ isConnected: false, selectedWallet: null })
      await store.getState().initializeConnection()
      expect(connectToWallet).not.toHaveBeenCalled()
    })

    it('should call detectWallets if availableWallets is empty', async () => {
      const talismanWallet = createMockWallet('talisman', 'Talisman')
      ;(getWallets as jest.Mock).mockReturnValue([talismanWallet])
      ;(connectToWallet as jest.Mock).mockResolvedValue({
        accounts: [mockAccount1],
        injector: mockExtension,
        wallet: talismanWallet,
      })

      const store = createWalletStore()
      store.setState({
        availableWallets: [],
        selectedWallet: 'talisman',
        selectedAccount: mockAccount1,
      })

      await store.getState().initializeConnection()

      expect(getWallets).toHaveBeenCalled()
      expect(store.getState().isConnected).toBe(true)
    })

    it('should clear persisted data if resolved wallet is not installed', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
      const uninstalledWallet = createMockWallet('talisman', 'Talisman', false)
      ;(getWalletBySource as jest.Mock).mockReturnValue(uninstalledWallet)

      const store = createWalletStore()
      store.setState({
        availableWallets: [uninstalledWallet],
        selectedWallet: 'talisman',
        selectedAccount: mockAccount1,
      })

      await store.getState().initializeConnection()

      const state = store.getState()
      expect(state.selectedWallet).toBeNull()
      expect(state.selectedAccount).toBeNull()
      expect(state.isConnected).toBe(false)
      expect(state.isLoading).toBe(false)
      logSpy.mockRestore()
    })

    it('should clear persisted data if persisted account no longer exists', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
      const talismanWallet = createMockWallet('talisman', 'Talisman')
      ;(connectToWallet as jest.Mock).mockResolvedValue({
        accounts: [mockAccount2], // Does not include mockAccount1
        injector: mockExtension,
        wallet: talismanWallet,
      })

      const store = createWalletStore()
      store.setState({
        availableWallets: [talismanWallet],
        selectedWallet: 'talisman',
        selectedAccount: mockAccount1,
      })

      await store.getState().initializeConnection()

      const state = store.getState()
      expect(state.selectedWallet).toBeNull()
      expect(state.selectedAccount).toBeNull()
      expect(state.isConnected).toBe(false)
      logSpy.mockRestore()
    })

    it('should clear persisted data on silent reconnection error', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
      const talismanWallet = createMockWallet('talisman', 'Talisman')
      ;(connectToWallet as jest.Mock).mockRejectedValue(new Error('Locked wallet'))

      const store = createWalletStore()
      store.setState({
        availableWallets: [talismanWallet],
        selectedWallet: 'talisman',
        selectedAccount: mockAccount1,
      })

      await store.getState().initializeConnection()

      const state = store.getState()
      expect(state.isConnected).toBe(false)
      expect(state.isLoading).toBe(false)
      expect(state.selectedWallet).toBeNull()
      expect(state.selectedAccount).toBeNull()
      warnSpy.mockRestore()
    })
  })

  describe('disconnectWallet, selectAccount & clearError', () => {
    it('should reset connection state on disconnectWallet', () => {
      const store = createWalletStore()
      store.setState({
        isConnected: true,
        selectedWallet: 'talisman',
        selectedAccount: mockAccount1,
        accounts: [mockAccount1],
        injector: mockExtension,
        connectionError: 'Some error',
      })

      store.getState().disconnectWallet()

      const state = store.getState()
      expect(state.isConnected).toBe(false)
      expect(state.selectedWallet).toBeNull()
      expect(state.selectedAccount).toBeNull()
      expect(state.accounts).toEqual([])
      expect(state.injector).toBeNull()
      expect(state.connectionError).toBeNull()
    })

    it('should select an existing account when connected', () => {
      const store = createWalletStore()
      store.setState({
        isConnected: true,
        accounts: [mockAccount1, mockAccount2],
        selectedAccount: mockAccount1,
      })

      store.getState().selectAccount(mockAccount2.address)
      expect(store.getState().selectedAccount).toEqual(mockAccount2)
    })

    it('should warn and not change account if not connected or account not found', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
      const store = createWalletStore()
      store.setState({
        isConnected: false,
        accounts: [mockAccount1],
        selectedAccount: mockAccount1,
      })

      store.getState().selectAccount(mockAccount1.address)
      expect(warnSpy).toHaveBeenCalledWith('Cannot select account when wallet is not connected')

      store.setState({ isConnected: true })
      store.getState().selectAccount('unknown-address')
      expect(warnSpy).toHaveBeenCalledWith('Account not found:', 'unknown-address')
      expect(store.getState().selectedAccount).toEqual(mockAccount1)

      warnSpy.mockRestore()
    })

    it('should clear connectionError on clearError', () => {
      const store = createWalletStore()
      store.setState({ connectionError: 'Some error' })

      store.getState().clearError()
      expect(store.getState().connectionError).toBeNull()
    })
  })
})
