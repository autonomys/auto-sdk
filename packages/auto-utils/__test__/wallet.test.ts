import { defaultNetwork, networks } from '../src/constants/network'
import { setupWallet } from '../src/wallet'

describe('Verify wallet functions', () => {
  const isLocalhost = process.env.LOCALHOST === 'true'

  // Define the test network and its details
  const TEST_NETWORK = !isLocalhost
    ? { networkId: networks[0].id }
    : { networkId: 'autonomys-localhost' }
  const TEST_NETWORK_DETAIL = networks.find((network) => network.id === TEST_NETWORK.networkId)
  if (!TEST_NETWORK_DETAIL) throw new Error(`Network with id ${TEST_NETWORK.networkId} not found`)

  const TEST_INVALID_NETWORK = { networkId: 'invalid-network' }

  const ALICE_MNEMONIC = 'bottom drive obey lake curtain smoke basket hold race lonely fit walk' //Alice
  const ALICE_ADDRESS = '5DFJF7tY4bpbpcKPJcBTQaKuCDEPCpiz8TRjpmLeTtweqmXL'
  const BOB_URI = '//BOB'
  const BOB_ADDRESS = '5DAw2FpYk2y3JHrsia14KEx7tpezNymdFKkunicZ5ygPGXYF'

  test('Check setupWallet return a pair with matching address and public key when provided with a mnemonic', async () => {
    const pair = setupWallet({ mnemonic: ALICE_MNEMONIC })
    expect(pair.address).toEqual(ALICE_ADDRESS)
  })

  test('Check setupWallet return a pair with matching private key when provided with a pk', async () => {
    const pair = setupWallet({ uri: BOB_URI })
    expect(pair.address).toEqual(BOB_ADDRESS)
  })
})
