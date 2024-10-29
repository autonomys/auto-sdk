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
  uploadOptions?: FileUploadOptions
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

        if (obj.uploadOptions != null) {
          w.uint32(50)
          FileUploadOptions.codec().encode(obj.uploadOptions, w)
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
            case 6: {
              obj.uploadOptions = FileUploadOptions.codec().decode(reader, reader.uint32(), {
                limits: opts.limits?.uploadOptions
              })
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
export interface FileUploadOptions {
  compression?: CompressionOptions
  encryption?: EncryptionOptions
}

export namespace FileUploadOptions {
  let _codec: Codec<FileUploadOptions>

  export const codec = (): Codec<FileUploadOptions> => {
    if (_codec == null) {
      _codec = message<FileUploadOptions>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.compression != null) {
          w.uint32(10)
          CompressionOptions.codec().encode(obj.compression, w)
        }

        if (obj.encryption != null) {
          w.uint32(18)
          EncryptionOptions.codec().encode(obj.encryption, w)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length, opts = {}) => {
        const obj: any = {}

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.compression = CompressionOptions.codec().decode(reader, reader.uint32(), {
                limits: opts.limits?.compression
              })
              break
            }
            case 2: {
              obj.encryption = EncryptionOptions.codec().decode(reader, reader.uint32(), {
                limits: opts.limits?.encryption
              })
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

  export const encode = (obj: Partial<FileUploadOptions>): Uint8Array => {
    return encodeMessage(obj, FileUploadOptions.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<FileUploadOptions>): FileUploadOptions => {
    return decodeMessage(buf, FileUploadOptions.codec(), opts)
  }
}

export interface CompressionOptions {
  algorithm: CompressionAlgorithm
  level?: number
}

export namespace CompressionOptions {
  let _codec: Codec<CompressionOptions>

  export const codec = (): Codec<CompressionOptions> => {
    if (_codec == null) {
      _codec = message<CompressionOptions>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.algorithm != null && __CompressionAlgorithmValues[obj.algorithm] !== 0) {
          w.uint32(8)
          CompressionAlgorithm.codec().encode(obj.algorithm, w)
        }

        if (obj.level != null) {
          w.uint32(16)
          w.int32(obj.level)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length, opts = {}) => {
        const obj: any = {
          algorithm: CompressionAlgorithm.ZLIB
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.algorithm = CompressionAlgorithm.codec().decode(reader)
              break
            }
            case 2: {
              obj.level = reader.int32()
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

  export const encode = (obj: Partial<CompressionOptions>): Uint8Array => {
    return encodeMessage(obj, CompressionOptions.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<CompressionOptions>): CompressionOptions => {
    return decodeMessage(buf, CompressionOptions.codec(), opts)
  }
}

export interface EncryptionOptions {
  algorithm: EncryptionAlgorithm
}

export namespace EncryptionOptions {
  let _codec: Codec<EncryptionOptions>

  export const codec = (): Codec<EncryptionOptions> => {
    if (_codec == null) {
      _codec = message<EncryptionOptions>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.algorithm != null && __EncryptionAlgorithmValues[obj.algorithm] !== 0) {
          w.uint32(8)
          EncryptionAlgorithm.codec().encode(obj.algorithm, w)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length, opts = {}) => {
        const obj: any = {
          algorithm: EncryptionAlgorithm.AES_256_GCM
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.algorithm = EncryptionAlgorithm.codec().decode(reader)
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

  export const encode = (obj: Partial<EncryptionOptions>): Uint8Array => {
    return encodeMessage(obj, EncryptionOptions.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<EncryptionOptions>): EncryptionOptions => {
    return decodeMessage(buf, EncryptionOptions.codec(), opts)
  }
}

export enum CompressionAlgorithm {
  ZLIB = 'ZLIB'
}

enum __CompressionAlgorithmValues {
  ZLIB = 0
}

export namespace CompressionAlgorithm {
  export const codec = (): Codec<CompressionAlgorithm> => {
    return enumeration<CompressionAlgorithm>(__CompressionAlgorithmValues)
  }
}
export enum EncryptionAlgorithm {
  AES_256_GCM = 'AES_256_GCM'
}

enum __EncryptionAlgorithmValues {
  AES_256_GCM = 0
}

export namespace EncryptionAlgorithm {
  export const codec = (): Codec<EncryptionAlgorithm> => {
    return enumeration<EncryptionAlgorithm>(__EncryptionAlgorithmValues)
  }
}
