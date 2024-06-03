import { defaultNetwork, networks } from '../src/constants/network'
import { getNetworkDetails, getNetworkRpcUrls } from '../src/network'

describe('Verify network functions', () => {
  test('Check getNetworkDetails return all network detail', async () => {
    const network = getNetworkDetails()
    expect(network).toEqual(defaultNetwork)
  })

  test('Check getNetworkRpcUrls return the network urls', async () => {
    const rpcUrls = getNetworkRpcUrls()
    expect(rpcUrls).toEqual(defaultNetwork.rpcUrls)
  })

  test('Check getNetworkDetails return the network detail for a specific network', async () => {
    const rpcUrls = getNetworkDetails(networks[0].id)
    expect(rpcUrls).toEqual(networks[0])
  })

  test('Check getNetworkRpcUrls return the network urls for a specific network', async () => {
    const rpcUrls = getNetworkRpcUrls(networks[0].id)
    expect(rpcUrls).toEqual(networks[0].rpcUrls)
  })

  test('Check getNetworkDetails return the network urls for an invalid network', async () => {
    expect(() => getNetworkDetails('invalid-network')).toThrow(
      'Network with id invalid-network not found',
    )
  })

  test('Check getNetworkRpcUrls return the network urls for an invalid network', async () => {
    expect(() => getNetworkRpcUrls('invalid-network')).toThrow(
      'Network with id invalid-network not found',
    )
  })
})
