import { ApiPromise, WsProvider } from '@polkadot/api'
import { activate } from '../src/api'
import { NetworkId } from '../src/constants/network'
import { getNetworkRpcUrls } from '../src/network'

jest.mock('@polkadot/api', () => ({
  ApiPromise: { create: jest.fn() },
  WsProvider: jest.fn(),
}))

const mockedCreate = ApiPromise.create as jest.Mock
const mockedWsProvider = WsProvider as unknown as jest.Mock

describe('activate', () => {
  const CHRONOS_RPC_URLS = getNetworkRpcUrls({ networkId: NetworkId.CHRONOS })

  beforeEach(() => {
    jest.clearAllMocks()
    mockedCreate.mockResolvedValue({ isReady: Promise.resolve() })
  })

  test('reusing one options object connects to the same network every time', async () => {
    const options = { networkId: NetworkId.CHRONOS }

    await activate(options)
    await activate(options)

    expect(mockedWsProvider).toHaveBeenCalledTimes(2)
    expect(mockedWsProvider).toHaveBeenNthCalledWith(1, CHRONOS_RPC_URLS)
    expect(mockedWsProvider).toHaveBeenNthCalledWith(2, CHRONOS_RPC_URLS)
    expect(options).toEqual({ networkId: NetworkId.CHRONOS })
  })

  test('accepts a frozen options object', async () => {
    const options = Object.freeze({ networkId: NetworkId.CHRONOS })

    await expect(activate(options)).resolves.toBeDefined()
    expect(mockedWsProvider).toHaveBeenCalledWith(CHRONOS_RPC_URLS)
  })

  test('forwards API options to ApiPromise.create without networkId', async () => {
    await activate({ networkId: NetworkId.CHRONOS, noInitWarn: false, types: { Custom: 'u32' } })

    const createOptions = mockedCreate.mock.calls[0][0]
    expect(createOptions).not.toHaveProperty('networkId')
    expect(createOptions.noInitWarn).toBe(false)
    expect(createOptions.types).toEqual(expect.objectContaining({ Custom: 'u32' }))
  })

  test('connects to the default network when called without params', async () => {
    await activate()

    expect(mockedWsProvider).toHaveBeenCalledWith(getNetworkRpcUrls())
    expect(mockedCreate.mock.calls[0][0]).not.toHaveProperty('networkId')
  })
})
