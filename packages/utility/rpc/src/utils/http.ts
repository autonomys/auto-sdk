import http from 'http'

export const parseHttpBody = (req: http.IncomingMessage): Promise<string | null> => {
  return new Promise((resolve) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => {
      chunks.push(chunk)
    })
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf-8')
      resolve(body)
    })
    req.on('error', (error) => {
      console.error('Error parsing HTTP body', error)
      resolve(null)
    })
  })
}
