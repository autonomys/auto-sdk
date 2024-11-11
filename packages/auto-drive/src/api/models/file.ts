export interface GenericFile {
  read(): AsyncIterable<Buffer>
  name: string
  mimeType?: string
  size: number
  path: string
}
