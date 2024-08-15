import { ZkpClaim, ZkpClaimJSON, ZkpClaimType } from './base'
import { SupportedClaimHashes } from '../claims'
import { Proof, Reclaim } from '@reclaimprotocol/js-sdk'

/// Implement the ZKPClaim class for Reclaim Protocol
export class ReclaimZKPClaim extends ZkpClaim {
  public type = ZkpClaimType.Reclaim

  constructor(
    serviceId: string,
    public readonly proof: Proof,
  ) {
    super(serviceId)
  }

  protected validateProofValidity(): Promise<boolean> {
    return Reclaim.verifySignedProof(this.proof)
  }

  private get claimHash(): string {
    try {
      const context = JSON.parse(this.proof.claimData.context)
      const { claimHash } = JSON.parse(context.contextMessage)
      return claimHash
    } catch (e) {
      throw new Error(`An error occurred while retrieving the claim hash: ${e}`)
    }
  }

  public getClaimSubUID(): string {
    try {
      switch (this.claimHash) {
        case SupportedClaimHashes.UberUUID:
          return this.getParameter('uuid')
        case SupportedClaimHashes.GithubUsername:
          return this.getParameter('username')
        default:
          throw new Error(`Unsupported claim hash: ${this.claimHash}`)
      }
    } catch (e) {
      throw new Error('An error occurred while retrieving the UID from the claimed data.')
    }
  }

  private getParameter(key: string): string {
    const value = JSON.parse(this.proof.claimData.parameters).paramValues
    if (!(key in value)) {
      throw new Error(`Parameter ${key} not found in the proof`)
    }
    return value[key]
  }

  toJSON(): ZkpClaimJSON {
    return {
      type: this.type,
      serviceId: this.serviceId,
      proof: this.proof,
    }
  }
}

export const constructReclaimZkpClaim = (serviceId: string, proof: Proof): ReclaimZKPClaim => {
  return new ReclaimZKPClaim(serviceId, proof)
}
