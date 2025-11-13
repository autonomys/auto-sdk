import { unlockNominator } from '@autonomys/auto-consensus'
import { setup, signAndSend } from './utils'

export const unlockNominatorFunction = async () => {
  const { api, alice } = await setup()

  try {
    const operatorId = '1'

    const tx = unlockNominator({
      api,
      operatorId,
    })

    console.log('\x1b[32m%s\x1b[0m', 'Transaction Prepared! (with hash:', tx.hash.toHex(), ')')
    console.log('\x1b[33m%s\x1b[0m', 'Now broadcasting transaction!\n')

    await signAndSend(alice[0], tx)
  } finally {
    await api.disconnect()
  }
}

unlockNominatorFunction()
  .then(() => {
    console.log('\x1b[34m%s\x1b[0m', 'Script executed successfully')
    process.exit(0)
  })
  .catch((e) => {
    console.error('\x1b[31m%s\x1b[0m', 'Error with script:', e)
    process.exit(1)
  })
