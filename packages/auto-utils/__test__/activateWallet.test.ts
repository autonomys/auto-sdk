import { ApiPromise } from '@polkadot/api'
import { NetworkId } from '../src/constants/network'
import { activateWallet } from '../src/wallet'

jest.mock('@polkadot/api', () => ({
  ...jest.requireActual('@polkadot/api'),
  ApiPromise: { create: jest.fn() },
  WsProvider: jest.fn(),
}))

const mockedCreate = ApiPromise.create as jest.Mock

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
})
