import { getWalletBySource, type Wallet } from '@talismn/connect-wallets'
import type { InjectedExtension } from '@polkadot/extension-inject/types'
import { connectToWallet } from '../src/connect'
import { DEFAULT_WALLET_CONFIG } from '../src/constants'

jest.mock('@talismn/connect-wallets', () => ({
  getWalletBySource: jest.fn(),
  getWallets: jest.fn(),
}))

describe('connectToWallet', () => {
  const mockExtension = {
    name: 'talisman',
    version: '1.0.0',
    accounts: {
      get: jest.fn(),
      subscribe: jest.fn(),
    },
    signer: {},
  } as unknown as InjectedExtension

  const createMockWallet = (overrides?: Partial<Wallet>): Wallet => {
    return {
      extensionName: 'talisman',
      title: 'Talisman',
      installed: true,
      extension: mockExtension,
      enable: jest.fn().mockResolvedValue(undefined),
      getAccounts: jest.fn().mockResolvedValue([
        {
          address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          name: 'Alice',
        },
      ]),
      ...overrides,
    } as unknown as Wallet
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useRealTimers()
  })

  it('should connect to an installed wallet and return formatted accounts', async () => {
    const mockWallet = createMockWallet()
    ;(getWalletBySource as jest.Mock).mockReturnValue(mockWallet)

    const result = await connectToWallet('talisman', DEFAULT_WALLET_CONFIG)

    expect(getWalletBySource).toHaveBeenCalledWith('talisman')
    expect(mockWallet.enable).toHaveBeenCalledWith(DEFAULT_WALLET_CONFIG.dappName)
    expect(mockWallet.getAccounts).toHaveBeenCalled()
    expect(result.accounts).toHaveLength(1)
    expect(result.accounts[0].name).toBe('Alice')
    expect(result.injector).toBe(mockExtension)
    expect(result.wallet).toBe(mockWallet)
  })

  it('should use pre-resolved wallet directly without calling getWalletBySource', async () => {
    const mockWallet = createMockWallet()

    const result = await connectToWallet('talisman', DEFAULT_WALLET_CONFIG, mockWallet)

    expect(getWalletBySource).not.toHaveBeenCalled()
    expect(result.wallet).toBe(mockWallet)
  })

  it('should throw an error if wallet is not found', async () => {
    ;(getWalletBySource as jest.Mock).mockReturnValue(undefined)

    await expect(connectToWallet('nonexistent', DEFAULT_WALLET_CONFIG)).rejects.toThrow(
      'Wallet not found: nonexistent',
    )
  })

  it('should throw an error if wallet is not installed', async () => {
    const mockWallet = createMockWallet({ installed: false })
    ;(getWalletBySource as jest.Mock).mockReturnValue(mockWallet)

    await expect(connectToWallet('talisman', DEFAULT_WALLET_CONFIG)).rejects.toThrow(
      'Talisman is not installed. Please install the extension first.',
    )
  })

  it('should throw timeout error when wallet.enable times out', async () => {
    const mockWallet = createMockWallet({
      enable: jest.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            const timer = setTimeout(resolve, 500)
            timer.unref?.()
          }),
      ),
    })
    ;(getWalletBySource as jest.Mock).mockReturnValue(mockWallet)

    const shortConfig = {
      ...DEFAULT_WALLET_CONFIG,
      connectionTimeout: 50,
    }

    await expect(connectToWallet('talisman', shortConfig)).rejects.toThrow('Connection timeout')
  })

  it('should throw timeout error when wallet.getAccounts times out', async () => {
    const mockWallet = createMockWallet({
      enable: jest.fn().mockResolvedValue(undefined),
      getAccounts: jest.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            const timer = setTimeout(resolve, 500)
            timer.unref?.()
          }),
      ),
    })
    ;(getWalletBySource as jest.Mock).mockReturnValue(mockWallet)

    const shortConfig = {
      ...DEFAULT_WALLET_CONFIG,
      connectionTimeout: 50,
    }

    await expect(connectToWallet('talisman', shortConfig)).rejects.toThrow('Connection timeout')
  })

  it('should throw an error if wallet.extension is missing after enable', async () => {
    const mockWallet = createMockWallet({
      extension: undefined,
    })
    ;(getWalletBySource as jest.Mock).mockReturnValue(mockWallet)

    await expect(connectToWallet('talisman', DEFAULT_WALLET_CONFIG)).rejects.toThrow(
      'Extension not available for talisman',
    )
  })

  it('should throw an error if rawAccounts is empty', async () => {
    const mockWallet = createMockWallet({
      getAccounts: jest.fn().mockResolvedValue([]),
    })
    ;(getWalletBySource as jest.Mock).mockReturnValue(mockWallet)

    await expect(connectToWallet('talisman', DEFAULT_WALLET_CONFIG)).rejects.toThrow(
      'No accounts found in Talisman. Please create or connect an account first.',
    )
  })

  it('should clear timeout handle upon successful connection', async () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')
    const mockWallet = createMockWallet()
    ;(getWalletBySource as jest.Mock).mockReturnValue(mockWallet)

    await connectToWallet('talisman', DEFAULT_WALLET_CONFIG)

    expect(clearTimeoutSpy).toHaveBeenCalled()
    clearTimeoutSpy.mockRestore()
  })

  it('should clear timeout handle when error occurs', async () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')
    const mockWallet = createMockWallet({
      enable: jest.fn().mockRejectedValue(new Error('User rejected connection')),
    })
    ;(getWalletBySource as jest.Mock).mockReturnValue(mockWallet)

    await expect(connectToWallet('talisman', DEFAULT_WALLET_CONFIG)).rejects.toThrow(
      'User rejected connection',
    )

    expect(clearTimeoutSpy).toHaveBeenCalled()
    clearTimeoutSpy.mockRestore()
  })
})
