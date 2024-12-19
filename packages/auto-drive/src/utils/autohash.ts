import type { CID } from 'multiformats/cid'

interface AutoCIDTransformers {
  stringToCid: (cid: string) => CID
  blake3HashFromCid: (cid: CID) => Uint8Array
}

export class AutoCID {
  constructor(
    private readonly cid: string,
    private readonly tools: AutoCIDTransformers,
  ) {}

  static async create(cid: string): Promise<AutoCID> {
    const tools = await getToolsFromAutoDagData
    return new AutoCID(cid, tools)
  }

  get asString(): string {
    return this.cid
  }

  get asCID(): CID {
    return this.tools.stringToCid(this.cid)
  }

  get asBlake3Hash(): Buffer {
    return Buffer.from(this.tools.blake3HashFromCid(this.asCID))
  }
}

export const getToolsFromAutoDagData: Promise<AutoCIDTransformers> = import(
  '@autonomys/auto-dag-data'
).then(({ stringToCid, blake3HashFromCid }) => {
  return {
    stringToCid,
    blake3HashFromCid,
  }
})
