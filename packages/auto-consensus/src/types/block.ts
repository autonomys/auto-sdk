import type { BN } from '@autonomys/auto-utils'

export type RawBlock = {
  block: {
    header: {
      parentHash: string
      number: BN
      stateRoot: string
      extrinsicsRoot: string
      digest: {
        logs: string[]
      }
    }
  }
}

type DigestLog = {
  preRuntime?: string[]
  consensus?: string[]
  other?: string
  seal?: string[]
}

export type RawBlockHeader = {
  parentHash: string
  number: number
  stateRoot: string
  extrinsicsRoot: string
  digest: {
    logs: DigestLog[]
  }
}

export type Block = {
  block: {
    header: {
      parentHash: string
      number: number
      stateRoot: string
      extrinsicsRoot: string
      digest: {
        logs: string[]
      }
    }
  }
}
