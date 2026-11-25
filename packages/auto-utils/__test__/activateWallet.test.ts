import { ApiPromise, WsProvider } from '@polkadot/api'
import { NetworkId } from '../src/constants/network'
import { getNetworkDomainRpcUrls, getNetworkRpcUrls } from '../src/network'
import type { ActivateWalletParams } from '../src/types/wallet'
import { activateWallet } from '../src/wallet'

jest.mock('@polkadot/api', () => ({
  ...jest.requireActual('@polkadot/api'),
  ApiPromise: { create: jest.fn() },
  WsProvider: jest.fn(),
}))

jest.mock('@polkadot/extension-dapp', () => ({
  web3Enable: jest.fn(),
  web3Accounts: jest.fn(async () => []),
}))

const mockedCreate = ApiPromise.create as jest.Mock
const mockedWsProvider = WsProvider as unknown as jest.Mock

const WALLET_FIELDS = ['mnemonic', 'uri', 'derivationPath', 'type', 'appName']
const TEST_MNEMONIC = 'test test test test test test test test test test test junk'
const TEST_ADDRESS_ETHEREUM_BIP44 = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
const ALICE_ADDRESS = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'

const CONSENSUS = { networkId: NetworkId.CHRONOS }
const DOMAIN = { networkId: NetworkId.CHRONOS, domainId: '0' }

class GetterConfig {
  uri = '//Alice'
  get networkId() {
    return DOMAIN.networkId
  }
  get domainId() {
    return DOMAIN.domainId
  }
}

const walletFieldsSentToApi = () =>
  Object.keys(mockedCreate.mock.calls[0][0]).filter((key) => WALLET_FIELDS.includes(key))

describe('activateWallet', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedCreate.mockImplementation(async () => ({ isReady: Promise.resolve() }))
  })

  test('accepts a frozen options object', async () => {
    const options = Object.freeze({ networkId: NetworkId.CHRONOS, uri: '//Alice' })

    const wallet = await activateWallet(options)

    expect(mockedCreate).toHaveBeenCalledTimes(1)
    expect(wallet.api).toBe(await mockedCreate.mock.results[0].value)
    expect(wallet.accounts).toHaveLength(1)
  })

  test('reusing one options object opens a new connection every time', async () => {
    const options = { networkId: NetworkId.CHRONOS, uri: '//Alice' }

    const first = await activateWallet(options)
    const second = await activateWallet(options)

    expect(mockedCreate).toHaveBeenCalledTimes(2)
    expect(second.api).not.toBe(first.api)
    expect(options).toEqual({ networkId: NetworkId.CHRONOS, uri: '//Alice' })
  })

  test('uses a provided api without connecting', async () => {
    const api = {} as ApiPromise

    const wallet = await activateWallet({ api, uri: '//Alice' })

    expect(mockedCreate).not.toHaveBeenCalled()
    expect(wallet.api).toBe(api)
  })

  test('does not connect when no wallet is provided', async () => {
    await expect(activateWallet({ networkId: NetworkId.CHRONOS, mnemonic: '' })).rejects.toThrow(
      'No wallet provided',
    )
    expect(mockedCreate).not.toHaveBeenCalled()
  })

  test('does not connect when the mnemonic is invalid', async () => {
    const mnemonic = Array(12).fill('abandon').join(' ')

    await expect(activateWallet({ networkId: NetworkId.CHRONOS, mnemonic })).rejects.toThrow(
      'Invalid bip39 mnemonic specified',
    )
    expect(mockedCreate).not.toHaveBeenCalled()
  })

  test('does not connect when the browser extension has no accounts', async () => {
    const global = globalThis as { window?: unknown }
    global.window = {}
    try {
      await expect(activateWallet({ networkId: NetworkId.CHRONOS, mnemonic: '' })).rejects.toThrow()
    } finally {
      delete global.window
    }
    expect(mockedCreate).not.toHaveBeenCalled()
  })

  test.each([
    ['consensus', CONSENSUS, getNetworkRpcUrls(CONSENSUS)],
    ['domain', DOMAIN, getNetworkDomainRpcUrls(DOMAIN)],
  ])(
    'keeps the mnemonic and wallet options out of the %s API options',
    async (_, network, rpcUrls) => {
      const { accounts } = await activateWallet({
        ...network,
        mnemonic: TEST_MNEMONIC,
        derivationPath: "m/44'/60'/0'/0/0",
        type: 'ethereum',
        appName: 'test-app',
      })

      expect(mockedWsProvider).toHaveBeenCalledWith(rpcUrls)
      expect(walletFieldsSentToApi()).toEqual([])
      expect(accounts[0].address).toEqual(TEST_ADDRESS_ETHEREUM_BIP44)
    },
  )

  test.each([
    ['consensus', CONSENSUS, getNetworkRpcUrls(CONSENSUS)],
    ['domain', DOMAIN, getNetworkDomainRpcUrls(DOMAIN)],
  ])('keeps the uri out of the %s API options', async (_, network, rpcUrls) => {
    const { accounts } = await activateWallet({ ...network, uri: '//Alice' })

    expect(mockedWsProvider).toHaveBeenCalledWith(rpcUrls)
    expect(walletFieldsSentToApi()).toEqual([])
    expect(accounts[0].address).toEqual(ALICE_ADDRESS)
  })

  test('still forwards API options to ApiPromise.create', async () => {
    await activateWallet({
      ...CONSENSUS,
      uri: '//Alice',
      noInitWarn: false,
      types: { Custom: 'u32' },
    } as ActivateWalletParams)

    const createOptions = mockedCreate.mock.calls[0][0]
    expect(createOptions.noInitWarn).toBe(false)
    expect(createOptions.types).toEqual(expect.objectContaining({ Custom: 'u32' }))
  })

  test.each([
    ['a class with getters', new GetterConfig()],
    ['an object with a prototype', Object.assign(Object.create(DOMAIN), { uri: '//Alice' })],
  ])('connects to the configured domain for %s', async (_, params) => {
    await activateWallet(params as ActivateWalletParams)

    expect(mockedWsProvider).toHaveBeenCalledWith(getNetworkDomainRpcUrls(DOMAIN))
  })
})
