export function stripPemHeaders(pem: string): string {
  return pem
    .replace(/-----BEGIN .*?-----/g, '')
    .replace(/-----END .*?-----/g, '')
    .replace(/\s+/g, '') // Remove all whitespace, including newlines and spaces
}
