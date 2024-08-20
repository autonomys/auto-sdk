/// This type is used to store the supported claim hashes
// The hex strings are generated using the blake2b_256 hash function
// over the key of the enum.
export enum SupportedClaimHashes {
  // blake2b_256('UberUUID')
  UberUUID = '0x4dc236d6a12027cdf9724e486a4b4083893a159b85238ffe746c86b8554b6006',
  // blake2b_256('GithubUsername')
  GithubUsername = '0x4a33942a0fa8e1672be8822fca9d67c86d7eb4d484c23687fa6001a3a504404b',
  // blake2b_256('GoogleEmail')
  GoogleEmail = '0xb1783c7989cbeb63de1767705043c67c7e365ee483990f77a0e48c3229878625',
}
