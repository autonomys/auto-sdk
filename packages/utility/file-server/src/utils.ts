import mime from 'mime-types'

export const inferMimeType = (filename: string) => {
  const extension = filename.split('.').pop()
  return extension
    ? mime.lookup(extension) || 'application/octet-stream'
    : 'application/octet-stream'
}
