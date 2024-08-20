import { ApiPromise, blake2b_256 } from '@autonomys/auto-utils'
import { Proof } from '@reclaimprotocol/js-sdk'
import { SupportedClaimHashes } from '../claims'

// This is the type of claim that can be used in the ZKP library
export enum ZkpClaimType {
  Reclaim = 'Reclaim',
}
interface ZkpClaimJSONBase {
  serviceId: string
}

/// This is should be the internal proof type used by the ZKP library
export type ZkpClaimInternalProof = Proof

// This is the type of claim that can be used in the ZKP library
export type ZkpClaimJSON = ZkpClaimJSONBase & {
  type: ZkpClaimType.Reclaim
  proof: Proof
}

export abstract class ZkpClaim {
  abstract type: ZkpClaimType
  public abstract readonly proof: ZkpClaimInternalProof

  constructor(public readonly serviceId: string) {}

  /// This function validates the proof using the Reclaim SDK
  protected abstract validateProofValidity(): Promise<boolean>

  /// This function generates a unique identifier for the claim.
  // With the claim hash, the UID is extracted from the proof
  protected abstract getClaimSubUID(): string

  // This function generates a unique identifier for the claim.
  // It is used to identify the claim in the ZKP registry.
  public getUID(): string {
    const subUID = this.getClaimSubUID()
    const digest = `${this.serviceId}:${subUID}`
    return blake2b_256(new TextEncoder().encode(digest))
  }

  // This function returns the claim hash
  public abstract get claimHash(): SupportedClaimHashes

  public async verify(_: ApiPromise): Promise<boolean> {
    const isValid = await this.validateProofValidity()
    if (!isValid) {
      return false
    }

    const zkpUID = this.getUID()
    /// @to-do check uid is not already in the registry
    // if api.zkp.getClaim(zkpUID).isEmpty === false: return false

    return true
  }
}
