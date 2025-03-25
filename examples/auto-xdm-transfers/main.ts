import { activateWallet, NetworkId } from '@autonomys/auto-utils'
import { transferToConsensus, transferToDomainAccount20Type } from '@autonomys/auto-xdm'

const mnemonic = 'test test test test test test test test test test test junk'

const {
  api: consensusApi,
  accounts: [consensusWallet],
  address: consensusAddress,
} = await activateWallet({
  networkId: NetworkId.TAURUS,
  mnemonic,
  type: 'sr25519',
})
console.log('consensusAddress', consensusAddress)

const {
  api: autoEvmApi,
  accounts: [autoEvmWallet],
  address: autoEvmAddress,
} = await activateWallet({
  networkId: NetworkId.TAURUS,
  mnemonic,
  type: 'sr25519',
})
console.log('autoEvmAddress', autoEvmAddress)

const transferToDomainTx = await transferToDomainAccount20Type(
  consensusApi,
  0,
  autoEvmAddress,
  '1000000000000000000',
)
console.log('transferToDomainTx', transferToDomainTx.hash.toHex())

const transferToDomainResult = await transferToDomainTx.signAndSend(consensusWallet)
console.log('transferToDomainResult', transferToDomainResult)

const transferToConsensusTx = await transferToConsensus(
  autoEvmApi,
  consensusAddress,
  '1000000000000000000',
)
console.log('transferToConsensusTx', transferToConsensusTx.hash.toHex())

const transferToConsensusResult = await transferToConsensusTx.signAndSend(autoEvmWallet)
console.log('transferToConsensusResult', transferToConsensusResult)

await consensusApi.disconnect()
await autoEvmApi.disconnect()
