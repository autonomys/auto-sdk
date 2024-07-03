// src/cli.ts
import { Command } from 'commander'
import { addressFunction } from './address'
import { balanceFunction } from './balance'
import { deregisterOperatorFunction } from './deregister-operator'
import { nominateOperatorFunction } from './nominate-operator'
import { operatorsFunction } from './operators'
import { registerOperatorFunction } from './register-operator'
import { transferFunction } from './transfer'
import { unlockFundsFunction } from './unlock-funds'
import { unlockNominatorFunction } from './unlock-nominator'
import { withdrawStakeFunction } from './withdraw-stake'

const program = new Command()

program.name('auto-cli').description('CLI for Autonomys functions').version('0.1.0')

program.command('address').description('Run the address function').action(addressFunction)

program.command('balance').description('Run the balance function').action(balanceFunction)

program.command('transfer').description('Run the transfer function').action(transferFunction)

program.command('operators').description('Run the operators function').action(operatorsFunction)

program
  .command('register-operator')
  .description('Run the register operator function')
  .action(registerOperatorFunction)

program
  .command('nominate-operator')
  .description('Run the nominate operator function')
  .action(nominateOperatorFunction)

program
  .command('withdraw-stake')
  .description('Run the withdraw stake function')
  .action(withdrawStakeFunction)

program
  .command('deregister-operator')
  .description('Run the deregister operator function')
  .action(deregisterOperatorFunction)

program
  .command('unlock-funds')
  .description('Run the unlock funds function')
  .action(unlockFundsFunction)

program
  .command('unlock-nominator')
  .description('Run the unlock nominator function')
  .action(unlockNominatorFunction)

program.parse(process.argv)
