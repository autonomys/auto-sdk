import { defaultNetwork, networks } from '../src/constants/network'
import { getNetworkDetails, getNetworkRpcUrls } from '../src/network'

describe('Verify network functions', () => {
  const isLocalhost = process.env.LOCALHOST === 'true'

  // Define the test network and its details
  const TEST_NETWORK = !isLocalhost ? { networkId: networks[0].id } : { networkId: 'autonomys-localhost' }
  const TEST_NETWORK_DETAIL = networks.find((network) => network.id === TEST_NETWORK.networkId)
  if (!TEST_NETWORK_DETAIL) throw new Error(`Network with id ${TEST_NETWORK.networkId} not found`)
  
  const TEST_INVALID_NETWORK = { networkId: 'invalid-network' }

  test('Check getNetworkDetails return all network detail', async () => {
    const network = getNetworkDetails()
    expect(network).toEqual(defaultNetwork)
  })

  test('Check getNetworkRpcUrls return the network urls', async () => {
    const rpcUrls = getNetworkRpcUrls()
    expect(rpcUrls).toEqual(defaultNetwork.rpcUrls)
  })

  test('Check getNetworkDetails return the network detail for a specific network', async () => {
    const rpcUrls = getNetworkDetails(TEST_NETWORK)
    expect(rpcUrls).toEqual(TEST_NETWORK_DETAIL)
  })

  test('Check getNetworkRpcUrls return the network urls for a specific network', async () => {
    const rpcUrls = getNetworkRpcUrls(TEST_NETWORK)
    expect(rpcUrls).toEqual(TEST_NETWORK_DETAIL.rpcUrls)
  })

  test('Check getNetworkDetails return the network urls for an invalid network', async () => {
    expect(() => getNetworkDetails(TEST_INVALID_NETWORK)).toThrow(
      'Network with id invalid-network not found',
    )
  })

  test('Check getNetworkRpcUrls return the network urls for an invalid network', async () => {
    expect(() => getNetworkRpcUrls(TEST_INVALID_NETWORK)).toThrow(
      'Network with id invalid-network not found',
    )
  })
})
