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
