import { Buffer } from 'buffer'

export interface GenericFile {
  read(): AsyncIterable<Buffer>
  name: string
  mimeType?: string
  size: number
}

export interface GenericFileWithinFolder extends GenericFile {
  path: string
}
