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

  public get claimHash(): SupportedClaimHashes {
    try {
      const context = JSON.parse(this.proof.claimData.context)
      const { claimHash } = JSON.parse(context.contextMessage)

      const isSupported = Object.values(SupportedClaimHashes).includes(claimHash)
      if (!isSupported) {
        throw new Error(`Unsupported claim hash: ${claimHash}`)
      }

      return claimHash
    } catch (e) {
      throw new Error(`An error occurred while retrieving the claim hash: ${e}`)
    }
  }

  public getClaimSubUID(): string {
    try {
      switch (this.claimHash) {
        case SupportedClaimHashes.UberUUID:
          return this.getParameter('uid')
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

export const claimHashToProviderIdMap: Record<SupportedClaimHashes, string | null> = {
  [SupportedClaimHashes.UberUUID]: '81dd6dc5-b50d-4276-b4cb-dc67bdcf919f',
  [SupportedClaimHashes.GithubUsername]: '6d3f6753-7ee6-49ee-a545-62f1b1822ae5',
}

export const reclaimSupportsClaimHash = (claimHash: SupportedClaimHashes) => {
  return claimHashToProviderIdMap[claimHash] !== null
}

export const buildReclaimRequest = async (appId: string, claimHash: SupportedClaimHashes) => {
  const providerId = claimHashToProviderIdMap[claimHash]
  if (!providerId) {
    throw new Error(`Provider ID not found for claim hash: ${claimHash}`)
  }

  const request = new Reclaim.ProofRequest(appId)

  // Address context is not used
  request.addContext('', JSON.stringify({ claimHash }))

  await request.buildProofRequest(providerId)

  return request
}
