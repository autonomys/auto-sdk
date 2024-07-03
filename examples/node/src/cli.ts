import { Command } from 'commander'

const program = new Command()
console.log(
  '\x1b[34m',
  `
                  t)                                d) k)     
                t)tTTT                              d) k)     
a)AAAA  u)   UU   t)    o)OOO           s)SSSS  d)DDDD k)  KK 
 a)AAA  u)   UU   t)   o)   OO ####### s)SSSS  d)   DD k)KK   
a)   A  u)   UU   t)   o)   OO              s) d)   DD k) KK  
 a)AAAA  u)UUU    t)T   o)OOO          s)SSSS   d)DDDD k)  KK
`,
  '\x1b[0m',
)

program.name('auto-sdk-example-cli').description('CLI for Autonomys functions').version('0.1.0')

program
  .command('address')
  .description('Run the address function')
  .action(async () => {
    const { addressFunction } = await import('./address')
    addressFunction()
  })

program
  .command('balance')
  .description('Run the balance function')
  .action(async () => {
    const { balanceFunction } = await import('./balance')
    balanceFunction()
  })

program
  .command('transfer')
  .description('Run the transfer function')
  .action(async () => {
    const { transferFunction } = await import('./transfer')
    transferFunction()
  })

program
  .command('operators')
  .description('Run the operators function')
  .action(async () => {
    const { operatorsFunction } = await import('./operators')
    operatorsFunction()
  })

program
  .command('register-operator')
  .description('Run the register operator function')
  .action(async () => {
    const { registerOperatorFunction } = await import('./register-operator')
    registerOperatorFunction()
  })

program
  .command('nominate-operator')
  .description('Run the nominate operator function')
  .action(async () => {
    const { nominateOperatorFunction } = await import('./nominate-operator')
    nominateOperatorFunction()
  })

program
  .command('withdraw-stake')
  .description('Run the withdraw stake function')
  .action(async () => {
    const { withdrawStakeFunction } = await import('./withdraw-stake')
    withdrawStakeFunction()
  })

program
  .command('deregister-operator')
  .description('Run the deregister operator function')
  .action(async () => {
    const { deregisterOperatorFunction } = await import('./deregister-operator')
    deregisterOperatorFunction()
  })

program
  .command('unlock-funds')
  .description('Run the unlock funds function')
  .action(async () => {
    const { unlockFundsFunction } = await import('./unlock-funds')
    unlockFundsFunction()
  })

program
  .command('unlock-nominator')
  .description('Run the unlock nominator function')
  .action(async () => {
    const { unlockNominatorFunction } = await import('./unlock-nominator')
    unlockNominatorFunction()
  })

program.parse(process.argv)
