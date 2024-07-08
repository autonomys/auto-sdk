import { address } from '@autonomys/auto-consensus'
import { setup } from './utils/setup'

export const addressFunction = async () => {
  const { alice, bob } = await setup()

  // Alice's Addresses
  console.log('\x1b[33m%s\x1b[0m', 'Alice Raw Address:', alice[0].address)
  const aliceAddress = address(alice[0].address)
  console.log('\x1b[32m%s\x1b[0m', 'Alice Clean Address:', aliceAddress, '\n')

  // Bob's Addresses
  console.log('\x1b[33m%s\x1b[0m', 'Bob Raw Address:', bob[0].address)
  const bobAddress = address(bob[0].address)
  console.log('\x1b[32m%s\x1b[0m', 'Bob Clean Address:', bobAddress, '\n')
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
