import { ActivateWalletParams, activateWallet, mockWallets, networks } from '@autonomys/auto-utils'
import { mnemonicGenerate } from '@polkadot/util-crypto'
import 'dotenv/config'

export const setup = async () => {
  const config =
    process.env.LOCALHOST !== 'true' ? { networkId: networks[0].id } : { networkId: 'localhost' }

  console.log('\x1b[32m%s\x1b[0m', 'Network:', config.networkId, '\n')

  const wallets = await mockWallets(config)

  const randomMnemonic = mnemonicGenerate()
  const { api, accounts: randomUser } = await activateWallet({
    ...config,
    uri: randomMnemonic,
  } as ActivateWalletParams)

  return { api, alice: wallets[0].accounts, bob: wallets[1].accounts, randomUser }
}
