import { ApiPromise, blake2b_256 } from '@autonomys/auto-utils'
import { Proof } from '@reclaimprotocol/js-sdk'
import { SupportedClaimHashes } from '../claims'

interface ZkpClaimJSONBase {
  serviceId: string
}

export type ZkpClaimJSON = ZkpClaimJSONBase & {
  type: ZkpClaimType.Reclaim
  proof: Proof
}

export abstract class ZkpClaim {
  abstract type: ZkpClaimType
  public abstract readonly proof: ZkpClaimInternalProof

  constructor(public readonly serviceId: string) {}

  protected abstract validateProofValidity(): Promise<boolean>
  protected abstract getClaimSubUID(): string

  // This function generates a unique identifier for the claim.
  // It is used to identify the claim in the ZKP registry.
  public getUID(): string {
    const subUID = this.getClaimSubUID()
    const digest = `${this.serviceId}:${subUID}`
    return blake2b_256(new TextEncoder().encode(digest))
  }

  public abstract get claimHash(): SupportedClaimHashes

  public async verify(_: ApiPromise): Promise<boolean> {
    const isValid = await this.validateProofValidity()
    if (!isValid) {
      return false
    }

    const zkpUID = this.getUID()
    /// @to-do check uid is not already in the registry

    return true
  }
}

export enum ZkpClaimType {
  Reclaim = 'Reclaim',
}

export type ZkpClaimInternalProof = Proof
