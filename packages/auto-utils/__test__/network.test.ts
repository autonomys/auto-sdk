import { defaultNetwork, networks } from '../src/constants/network'
import { getNetworkDetails, getNetworkRpcUrls } from '../src/network'

describe('Verify network functions', () => {
  const TEST_NETWORK = { networkId: networks[0].id }
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
    expect(rpcUrls).toEqual(networks[0])
  })

  test('Check getNetworkRpcUrls return the network urls for a specific network', async () => {
    const rpcUrls = getNetworkRpcUrls(TEST_NETWORK)
    expect(rpcUrls).toEqual(networks[0].rpcUrls)
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
