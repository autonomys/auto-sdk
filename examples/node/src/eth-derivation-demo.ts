import { setupWallet } from '@autonomys/auto-utils'
import { HDNodeWallet, Mnemonic, Wallet } from 'ethers'

const MNEMONIC = 'test test test test test test test test test test test junk'

const main = async (): Promise<void> => {
  const master = setupWallet({ mnemonic: MNEMONIC, type: 'ethereum' })

  const bip44Path = "m/44'/60'/0'/0/0"
  const bip44 = setupWallet({
    mnemonic: MNEMONIC,
    type: 'ethereum',
    derivationPath: bip44Path,
  })

  const ethersMnemonic = Mnemonic.fromPhrase(MNEMONIC)
  const ethersWallet = Wallet.fromPhrase(MNEMONIC)
  const ethersMaster = HDNodeWallet.fromMnemonic(ethersMnemonic, 'm')
  const ethersBip44 = HDNodeWallet.fromMnemonic(ethersMnemonic, bip44Path)

  console.log('Mnemonic:', MNEMONIC)
  console.log('Master (m) address:', master.address)
  console.log(`BIP44 (${bip44Path}) address:`, bip44.address)
  console.log('Ethers Wallet address:', ethersWallet.address)
  console.log('Ethers Master (m) address:', ethersMaster.address)
  console.log(`Ethers BIP44 (${bip44Path}) address:`, ethersBip44.address)
  console.log('Match?', master.address.toLowerCase() === bip44.address.toLowerCase())
  console.log(
    'Auto (m) === Ethers (m)?',
    master.address.toLowerCase() === ethersMaster.address.toLowerCase(),
  )
  console.log(
    `Auto BIP44 === Ethers BIP44?`,
    bip44.address.toLowerCase() === ethersBip44.address.toLowerCase(),
  )
  console.log(
    'Note: Current SDK behavior derives Ethereum from master key (m) unless a path is provided.',
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
