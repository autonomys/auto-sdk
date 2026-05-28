import { createHash } from 'crypto'
import { formatETag, md5Hex, multipartETag } from '../etag.js'

describe('md5Hex', () => {
  it('computes the MD5 of an empty buffer', () => {
    expect(md5Hex(Buffer.from(''))).toBe('d41d8cd98f00b204e9800998ecf8427e')
  })

  it('computes the MD5 of a known input', () => {
    // echo -n "hello" | md5
    expect(md5Hex(Buffer.from('hello'))).toBe('5d41402abc4b2a76b9719d911017c592')
  })
})

describe('formatETag', () => {
  it('wraps a hex digest in double quotes', () => {
    expect(formatETag('5d41402abc4b2a76b9719d911017c592')).toBe(
      '"5d41402abc4b2a76b9719d911017c592"',
    )
  })
})

describe('multipartETag', () => {
  it('computes the AWS composite ETag from quoted part ETags', () => {
    const part1 = md5Hex(Buffer.from('part-one'))
    const part2 = md5Hex(Buffer.from('part-two'))

    const expectedComposite = createHash('md5')
      .update(Buffer.concat([Buffer.from(part1, 'hex'), Buffer.from(part2, 'hex')]))
      .digest('hex')

    expect(multipartETag([formatETag(part1), formatETag(part2)])).toBe(
      `"${expectedComposite}-2"`,
    )
  })

  it('accepts unquoted part ETags as well', () => {
    const part1 = md5Hex(Buffer.from('a'))
    const quoted = multipartETag([formatETag(part1)])
    const unquoted = multipartETag([part1])
    expect(unquoted).toBe(quoted)
  })

  it('appends the part count after a hyphen', () => {
    const parts = [
      md5Hex(Buffer.from('1')),
      md5Hex(Buffer.from('2')),
      md5Hex(Buffer.from('3')),
    ]
    expect(multipartETag(parts)).toMatch(/^"[0-9a-f]{32}-3"$/)
  })
})
