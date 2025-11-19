import { address, cryptoWaitReady, setupWallet } from '@autonomys/auto-utils'

export const addressFunction = async () => {
  // Initialize WASM crypto before using wallet functions
  await cryptoWaitReady()

  const alice = setupWallet({ uri: '//Alice' })
  const bob = setupWallet({ uri: '//Bob' })
  // Alice's Addresses
  console.log('\x1b[33m%s\x1b[0m', 'Alice Raw Address:', alice.commonAddress)
  const aliceAddress = address(alice.commonAddress)
  console.log('\x1b[32m%s\x1b[0m', 'Alice Autonomys (6094) Address:', aliceAddress, '\n')

  // Bob's Addresses
  console.log('\x1b[33m%s\x1b[0m', 'Bob Raw Address:', bob.commonAddress)
  const bobAddress = address(bob.commonAddress)
  console.log('\x1b[32m%s\x1b[0m', 'Bob Autonomys (6094) Address:', bobAddress, '\n')
}

addressFunction()
  .then(() => {
    console.log('\x1b[34m%s\x1b[0m', 'Script executed successfully')
    process.exit(0)
  })
  .catch((e) => {
    console.error('\x1b[31m%s\x1b[0m', 'Error with script:', e)
    process.exit(1)
  })
