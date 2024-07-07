import { operators } from '@autonomys/auto-consensus'
import { setup } from './utils/setup'

export const operatorsFunction = async () => {
  const { api } = await setup()

  // Query all operators
  const allOperators = await operators(api)
  console.log('\x1b[36m%s\x1b[0m', 'allOperators:', allOperators, '\x1b[0m')
}

operatorsFunction()
  .then(() => {
    console.log('\x1b[34m%s\x1b[0m', 'Script executed successfully')
    process.exit(0)
  })
  .catch((e) => {
    console.error('\x1b[31m%s\x1b[0m', 'Error with script:', e)
    process.exit(1)
  })
