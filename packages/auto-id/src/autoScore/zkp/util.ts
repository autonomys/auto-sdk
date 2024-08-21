import { ZkpClaim, ZkpClaimJSON, ZkpClaimType } from './base'
import { ReclaimZKPClaim } from './reclaim'

// This function constructs a ZkpClaim from a ZkpClaimJSON
export const constructZkpClaim = ({ type, serviceId, proof }: ZkpClaimJSON): ZkpClaim => {
  if (type === ZkpClaimType.Reclaim) {
    return new ReclaimZKPClaim(serviceId, proof)
  } else {
    return type
  }
}

// This function converts a ZkpClaim to a ZkpClaimJSON
export const zkpClaimToJSON = (claim: ZkpClaim): ZkpClaimJSON => {
  return {
    type: claim.type,
    serviceId: claim.serviceId,
    proof: claim.proof,
  }
}
