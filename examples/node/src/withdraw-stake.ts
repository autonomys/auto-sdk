import { balance, nominatorPosition, operator, withdrawStake } from '@autonomys/auto-consensus'
import { address } from '@autonomys/auto-utils'
import { setup, signAndSend } from './utils'

export const withdrawStakeFunction = async () => {
  const { api, alice } = await setup()

  try {
    const operatorId = '1'
    const aliceAddress = address(alice[0].address)

    // Get Alice's position with the operator to find her shares
    const position = await nominatorPosition(api, operatorId, aliceAddress)
    const aliceBalance = await balance(api, aliceAddress)

    console.log('\x1b[36m%s\x1b[0m', 'Alice Free Balance:', aliceBalance.free.toString(), 'AI3')

    if (position.totalShares === BigInt(0)) {
      console.log(
        '\x1b[33m%s\x1b[0m',
        'Alice has no shares with operator',
        operatorId,
        '- cannot withdraw stake',
      )
      return
    }

    console.log(
      '\x1b[36m%s\x1b[0m',
      'Alice has',
      position.totalShares.toString(),
      'shares with operator',
      operatorId,
    )

    // Check for pending deposit - if there is one, shares might not be withdrawable yet
    if (position.pendingDeposit) {
      console.log(
        '\x1b[33m%s\x1b[0m',
        'Warning: Alice has a pending deposit of',
        position.pendingDeposit.amount.toString(),
        'that will be effective at epoch',
        position.pendingDeposit.effectiveEpoch,
      )
    }

    // Check for pending withdrawals
    if (position.pendingWithdrawals.length > 0) {
      console.log(
        '\x1b[33m%s\x1b[0m',
        'Warning: Alice has',
        position.pendingWithdrawals.length.toString(),
        'pending withdrawal(s)',
      )
    }

    // Get operator details to check domain
    const operatorDetails = await operator(api, operatorId)

    // Ensure Alice has enough free balance to cover fees
    const MIN_FEE_BUFFER = BigInt(1_000_000_000_000) // 0.001 AI3
    if (aliceBalance.free <= MIN_FEE_BUFFER) {
      console.log(
        '\x1b[31m%s\x1b[0m',
        'Insufficient free balance to cover fees, aborting withdrawal.',
      )
      return
    }

    // Withdraw a small portion of shares (like the test does - 1/1000th)
    // This avoids trying to withdraw all shares which might fail if there are constraints
    const sharesToWithdraw = position.totalShares / BigInt(1000)

    if (sharesToWithdraw === BigInt(0)) {
      console.log(
        '\x1b[33m%s\x1b[0m',
        'Cannot withdraw: shares amount would be zero (total shares too small)',
      )
      return
    }

    console.log(
      '\x1b[36m%s\x1b[0m',
      'Withdrawing',
      sharesToWithdraw.toString(),
      'shares (1/1000th of total)',
    )

    const tx = withdrawStake({
      api,
      operatorId,
      shares: sharesToWithdraw,
    })

    console.log('\x1b[32m%s\x1b[0m', 'Transaction Prepared! (with hash:', tx.hash.toHex(), ')')
    console.log('\x1b[33m%s\x1b[0m', 'Now broadcasting transaction!\n')

    await signAndSend(alice[0], tx)
  } finally {
    await api.disconnect()
  }
}

withdrawStakeFunction()
  .then(() => {
    console.log('\x1b[34m%s\x1b[0m', 'Script executed successfully')
    process.exit(0)
  })
  .catch((e) => {
    console.error('\x1b[31m%s\x1b[0m', 'Error with script:', e)
    process.exit(1)
  })
