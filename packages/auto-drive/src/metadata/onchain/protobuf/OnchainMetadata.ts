/* eslint-disable import/export */
/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare */
/* eslint-disable @typescript-eslint/no-empty-interface */

import { type Codec, decodeMessage, type DecodeOptions, encodeMessage, enumeration, message } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface IPLDNodeData {
  type: MetadataType
  linkDepth: number
  size?: number
  name?: string
  data?: Uint8Array
}

export namespace IPLDNodeData {
  let _codec: Codec<IPLDNodeData>

  export const codec = (): Codec<IPLDNodeData> => {
    if (_codec == null) {
      _codec = message<IPLDNodeData>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.type != null && __MetadataTypeValues[obj.type] !== 0) {
          w.uint32(8)
          MetadataType.codec().encode(obj.type, w)
        }

        if ((obj.linkDepth != null && obj.linkDepth !== 0)) {
          w.uint32(16)
          w.int32(obj.linkDepth)
        }

        if (obj.size != null) {
          w.uint32(24)
          w.int32(obj.size)
        }

        if (obj.name != null) {
          w.uint32(34)
          w.string(obj.name)
        }

        if (obj.data != null) {
          w.uint32(42)
          w.bytes(obj.data)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length, opts = {}) => {
        const obj: any = {
          type: MetadataType.File,
          linkDepth: 0
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.type = MetadataType.codec().decode(reader)
              break
            }
            case 2: {
              obj.linkDepth = reader.int32()
              break
            }
            case 3: {
              obj.size = reader.int32()
              break
            }
            case 4: {
              obj.name = reader.string()
              break
            }
            case 5: {
              obj.data = reader.bytes()
              break
            }
            default: {
              reader.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      })
    }

    return _codec
  }

  export const encode = (obj: Partial<IPLDNodeData>): Uint8Array => {
    return encodeMessage(obj, IPLDNodeData.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<IPLDNodeData>): IPLDNodeData => {
    return decodeMessage(buf, IPLDNodeData.codec(), opts)
  }
}

export enum MetadataType {
  File = 'File',
  FileInlink = 'FileInlink',
  FileChunk = 'FileChunk',
  Folder = 'Folder',
  FolderInlink = 'FolderInlink',
  Metadata = 'Metadata',
  MetadataInlink = 'MetadataInlink',
  MetadataChunk = 'MetadataChunk'
}

enum __MetadataTypeValues {
  File = 0,
  FileInlink = 1,
  FileChunk = 2,
  Folder = 3,
  FolderInlink = 4,
  Metadata = 5,
  MetadataInlink = 6,
  MetadataChunk = 7
}

export namespace MetadataType {
  export const codec = (): Codec<MetadataType> => {
    return enumeration<MetadataType>(__MetadataTypeValues)
  }
}
