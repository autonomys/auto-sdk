import { operator } from '@autonomys/auto-consensus'
import { setup } from './utils/setup'

const main = async () => {
  const { api } = await setup()

  const operatorOne = await operator(api, 1)
  console.log('\x1b[36m%s\x1b[0m', 'operatorOne:', operatorOne, '\x1b[0m')
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
