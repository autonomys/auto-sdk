import { address, balance } from '@autonomys/auto-consensus'
import { setup } from './utils/setup'

export const balanceFunction = async () => {
  const { api, alice, bob } = await setup()

  // Alice's Addresses and Balance
  const aliceAddress = address(alice[0].address)
  console.log('\x1b[32m%s\x1b[0m', 'Alice Clean Address:', aliceAddress)
  const aliceBalance = await balance(api, aliceAddress)
  console.log(
    '\x1b[36m%s\x1b[0m',
    'Alice Free Balance:',
    aliceBalance.free.toString(),
    '\x1b[36m',
    'ATC',
    '\x1b[0m\n',
  )

  // Bob's Addresses and Balance
  const bobAddress = address(bob[0].address)
  console.log('\x1b[32m%s\x1b[0m', 'Bob Clean Address:', bobAddress)
  const bobBalance = await balance(api, bobAddress)
  console.log(
    '\x1b[36m%s\x1b[0m',
    'Bob Free Balance:',
    bobBalance.free.toString(),
    '\x1b[36m',
    'ATC',
    '\x1b[0m\n',
    '\n',
  )
}

balanceFunction()
  .then(() => {
    console.log('\x1b[34m%s\x1b[0m', 'Script executed successfully')
    process.exit(0)
  })
  .catch((e) => {
    console.error('\x1b[31m%s\x1b[0m', 'Error with script:', e)
    process.exit(1)
  })
