import { ApiPromise, Keyring, WsProvider } from '@polkadot/api'
import { encodeAddress } from '@polkadot/keyring'
import { AccountInfo } from '@polkadot/types/interfaces'

async function balanceOf(api: ApiPromise, address: string) {
  const accountInfo = (await api.query.system.account(address)) as unknown as AccountInfo

  return accountInfo.data.free.toString()
}

async function main() {
  // connect to the consensus node
  // const wsProvider = new WsProvider('ws://127.0.0.1:9944')
  // auto-id domain
  const wsProvider = new WsProvider('ws://127.0.0.1:59352')
  const api = await ApiPromise.create({ provider: wsProvider })
  // Wait until we are ready and connected
  await api.isReady

  console.log(`Genesis hash: ${api.genesisHash.toHex()}`)
  console.log(`Runtime spec name: ${api.runtimeVersion.specName.toString()}`)
  console.log(`Runtime spec version: ${api.runtimeVersion.specVersion.toString()}`)
  // console.log(`Runtime metadata: ${api.runtimeMetadata}`)

  // Initialize the signer keypair
  const keyring = new Keyring({ type: 'sr25519' })
  const alice = keyring.createFromUri('//Alice')
  const bob = keyring.createFromUri('//Bob')
  console.log(`Alice's SS58 Address: ${alice.address}`)
  console.log(
    `Alice's public key: 0x${Array.from(alice.publicKey)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')}`,
  )

  // get the account info
  const aliceAccountInfo = (await api.query.system.account(alice.address)) as unknown as AccountInfo

  // subspace address by encoding with no. 2254
  const ssAddress = encodeAddress(alice.address, 2254)
  console.log(`Alice's SS Address: ${ssAddress}`)

  // get the balances
  console.log(`Alice's free balance: ${await balanceOf(api, alice.address)}`)
  console.log(`Bob's free balance: ${await balanceOf(api, bob.address)}`)

  // TODO: run the auto-id pallet's extrinsic to register an id.
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
