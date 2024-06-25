import { address, balance, nominateOperator } from '@autonomys/auto-consensus'
import { setup, signAndSend } from './utils'

const main = async () => {
  const { api, alice } = await setup()

  // Alice's Addresses
  const aliceAddress = address(alice[0].address)

  // Initial Balances
  const initialAliceBalance = await balance(api, aliceAddress)
  console.log(
    '\x1b[36m%s\x1b[0m',
    'Alice Initial Balance:',
    initialAliceBalance.free.toString(),
    '\x1b[36m',
    'ATC',
    '\x1b[0m',
  )

  // Transfer 2x10^18 ATC tokens from Alice to Bob
  const amountToStake = BigInt(10 * 10 ** 18)
  const tx = await nominateOperator({
    api,
    operatorId: '0',
    amountToStake,
  })

  console.log('\x1b[32m%s\x1b[0m', 'Transaction Prepared! (with hash:', tx.hash.toHex(), ')')
  console.log('\x1b[33m%s\x1b[0m', 'Now broadcasting transaction!\n')

  await signAndSend(alice[0], tx)

  // Final Balances
  const finalAliceBalance = await balance(api, aliceAddress)
  console.log(
    '\n\x1b[36m%s\x1b[0m',
    'Alice Final Balance:',
    finalAliceBalance.free.toString(),
    '\x1b[36m',
    'ATC',
    '\x1b[0m',
  )
}

main()
  .then(() => {
    console.log('\x1b[34m%s\x1b[0m', 'Script executed successfully')
    process.exit(0)
  })
  .catch((e) => {
    console.error('\x1b[31m%s\x1b[0m', 'Error with script:', e)
    process.exit(1)
  })
