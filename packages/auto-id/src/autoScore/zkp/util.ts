import { ZkpClaim, ZkpClaimJSON, ZkpClaimType } from './base'
import { ReclaimZKPClaim } from './reclaim'

export const constructZkpClaim = ({ type, serviceId, proof }: ZkpClaimJSON): ZkpClaim => {
  if (type === ZkpClaimType.Reclaim) {
    return new ReclaimZKPClaim(serviceId, proof)
  } else {
    return type
  }
}

export const zkpClaimToJSON = (claim: ZkpClaim): ZkpClaimJSON => {
  return {
    type: claim.type,
    serviceId: claim.serviceId,
    proof: claim.proof,
  }
}
