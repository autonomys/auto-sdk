// file: src/utils/sudo.ts

import {
  AddressOrPair,
  ApiPromise,
  Events,
  ISubmittableResult,
  signAndSendTx,
  SignerOptions,
  SubmittableExtrinsic,
} from '@autonomys/auto-utils'
import { expectSuccessfulTxEvent } from './events'

/**
 * Executes a transaction with sudo (superuser) privileges.
 * 
 * This function wraps a transaction with sudo privileges, allowing it to be executed
 * with administrative permissions. This is typically used for privileged operations
 * like network upgrades, parameter changes, or emergency actions that require
 * elevated permissions.
 * 
 * @param api - The connected API promise instance
 * @param sender - The account with sudo privileges (typically Alice in test networks)
 * @param tx - The transaction to execute with sudo privileges
 * @param options - Optional signer options for transaction customization
 * @param eventsExpected - Array of expected events to validate transaction success
 * @param log - Whether to log transaction details (default: true)
 * @returns Promise that resolves to transaction result details
 * @throws Error if the sender doesn't have sudo privileges or transaction fails
 * 
 * @example
 * ```typescript
 * import { sudo } from '@autonomys/auto-consensus'
 * import { activate, activateWallet } from '@autonomys/auto-utils'
 * 
 * const api = await activate({ networkId: 'localhost' })
 * const { accounts } = await activateWallet({ 
 *   networkId: 'localhost', 
 *   uri: '//Alice' 
 * })
 * const alice = accounts[0]
 * 
 * // Execute a privileged transaction
 * const privilegedTx = api.tx.system.setCode(newRuntimeWasm)
 * const result = await sudo(api, alice, privilegedTx)
 * 
 * console.log(`Sudo transaction executed: ${result.txHash}`)
 * ```
 */
export const sudo = async (
  api: ApiPromise,
  sender: AddressOrPair,
  tx: SubmittableExtrinsic<'promise', ISubmittableResult>,
  options: Partial<SignerOptions> = {},
  eventsExpected: Events = expectSuccessfulTxEvent,
  log: boolean = true,
) => await signAndSendTx(sender, api.tx.sudo.sudo(tx), options, eventsExpected, log)
