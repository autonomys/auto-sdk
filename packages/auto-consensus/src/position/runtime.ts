import type { NominatorPosition } from '../types/position'

// Runtime types for the API response
interface RuntimeStorageFeeDeposit {
  totalDeposited: { toString(): string }
  currentValue: { toString(): string }
}

interface RuntimePendingDeposit {
  amount: { toString(): string }
  effectiveEpoch: { toNumber(): number }
}

interface RuntimePendingWithdrawal {
  stakeWithdrawalAmount: { toString(): string }
  storageFeeRefund: { toString(): string }
  unlockAtBlock: { toNumber(): number }
}

interface RuntimeNominatorPosition {
  currentStakedValue: { toString(): string }
  totalShares: { toString(): string }
  storageFeeDeposit: RuntimeStorageFeeDeposit
  pendingDeposit: {
    isSome: boolean
    isNone: boolean
    unwrap(): RuntimePendingDeposit
  }
  pendingWithdrawals: RuntimePendingWithdrawal[]
}

// The API response is an Option-like object
export interface RuntimeNominatorPositionResponse {
  isNone: boolean
  isSome: boolean
  unwrap(): RuntimeNominatorPosition
}

/**
 * Converts runtime nominator position data to TypeScript NominatorPosition type.
 *
 * This function handles the conversion from the runtime API response format
 * to the clean TypeScript types used by the SDK, including BigInt conversions
 * and Option unwrapping.
 *
 * @param runtimePosition - The runtime nominator position data
 * @returns Converted NominatorPosition object
 */
export const convertRuntimePosition = (
  runtimePosition: RuntimeNominatorPosition,
): NominatorPosition => {
  return {
    currentStakedValue: BigInt(runtimePosition.currentStakedValue.toString()),
    totalShares: BigInt(runtimePosition.totalShares.toString()),
    storageFeeDeposit: {
      totalDeposited: BigInt(runtimePosition.storageFeeDeposit.totalDeposited.toString()),
      currentValue: BigInt(runtimePosition.storageFeeDeposit.currentValue.toString()),
    },
    pendingDeposit: runtimePosition.pendingDeposit.isSome
      ? {
          amount: BigInt(runtimePosition.pendingDeposit.unwrap().amount.toString()),
          effectiveEpoch: runtimePosition.pendingDeposit.unwrap().effectiveEpoch.toNumber(),
        }
      : null,
    pendingWithdrawals: runtimePosition.pendingWithdrawals.map((withdrawal) => ({
      stakeWithdrawalAmount: BigInt(withdrawal.stakeWithdrawalAmount.toString()),
      storageFeeRefund: BigInt(withdrawal.storageFeeRefund.toString()),
      unlockAtBlock: withdrawal.unlockAtBlock.toNumber(),
    })),
  }
}

/**
 * Creates an empty NominatorPosition for when no position exists.
 *
 * @returns Empty NominatorPosition with zero values
 */
export const createEmptyPosition = (): NominatorPosition => {
  return {
    currentStakedValue: BigInt(0),
    totalShares: BigInt(0),
    storageFeeDeposit: {
      totalDeposited: BigInt(0),
      currentValue: BigInt(0),
    },
    pendingDeposit: null,
    pendingWithdrawals: [],
  }
}
