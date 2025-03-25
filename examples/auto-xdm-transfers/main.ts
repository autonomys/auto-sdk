import { activateDomain, NetworkId, setupWallet } from '@autonomys/auto-utils'
import { transferToConsensus } from '@autonomys/auto-xdm'

const mnemonic = 'test test test test test test test test test test test junk'

const api = await activateDomain({
  domainId: '0',
  networkId: NetworkId.TAURUS,
})

const consensusWallet = setupWallet({ mnemonic, type: 'sr25519' })
console.log('consensusWallet', consensusWallet.address)
const autoEvmWallet = setupWallet({ mnemonic, type: 'ethereum' })
console.log('autoEvmWallet', autoEvmWallet.address)

if (!autoEvmWallet.keyringPair) throw new Error('EVM wallet not found')

const transfer = await transferToConsensus(api, consensusWallet.address, '1000000000000000000')
console.log('transfer', transfer.hash.toHex())

const transferResult = await transfer.signAndSend(autoEvmWallet.keyringPair)
console.log('transferResult', transferResult)

await api.disconnect()
