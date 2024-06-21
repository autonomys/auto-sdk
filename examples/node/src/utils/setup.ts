import { ActivateWalletInput, activateWallet, networks } from '@autonomys/auto-utils'
import { mnemonicGenerate } from '@polkadot/util-crypto'
import 'dotenv/config'

export const setup = async () => {
  if (!process.env.ALICE_SEED) throw new Error('Missing ALICE_SEED in .env')
  if (!process.env.BOB_SEED) throw new Error('Missing BOB_SEED in .env')

  const config =
    process.env.LOCALHOST !== 'true'
      ? { networkId: networks[0].id }
      : { networkId: 'autonomys-localhost' }

  console.log('\x1b[32m%s\x1b[0m', 'Network:', config.networkId, '\n')

  const { api, accounts: alice } = await activateWallet({
    ...config,
    uri: process.env.ALICE_SEED,
  } as ActivateWalletInput)

  const { accounts: bob } = await activateWallet({
    ...config,
    uri: process.env.BOB_SEED,
  } as ActivateWalletInput)

  const randomMnemonic = mnemonicGenerate()
  const { accounts: randomUser } = await activateWallet({
    ...config,
    uri: randomMnemonic,
  } as ActivateWalletInput)

  return { api, alice, bob, randomUser }
}
