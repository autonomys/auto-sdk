import { unlockNominator } from '@autonomys/auto-consensus'
import { setup, signAndSend } from './utils'

const main = async () => {
  const { api, alice } = await setup()

  const operatorId = '1'

  const tx = await unlockNominator({
    api,
    operatorId,
  })

  console.log('\x1b[32m%s\x1b[0m', 'Transaction Prepared! (with hash:', tx.hash.toHex(), ')')
  console.log('\x1b[33m%s\x1b[0m', 'Now broadcasting transaction!\n')

  await signAndSend(alice[0], tx)
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
