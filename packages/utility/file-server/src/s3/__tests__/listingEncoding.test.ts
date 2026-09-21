import {
  encodeS3Key,
  hasXmlIllegalChars,
  planListingEncoding,
  XML_ILLEGAL_CHARS,
} from '../listingEncoding.js'

describe('listingEncoding', () => {
  describe('XML_ILLEGAL_CHARS & hasXmlIllegalChars', () => {
    it('returns true for XML 1.0 illegal control characters', () => {
      expect(hasXmlIllegalChars('hello\x00world')).toBe(true)
      expect(hasXmlIllegalChars('test\x08file')).toBe(true)
      expect(hasXmlIllegalChars('path\x0Bname')).toBe(true)
      expect(hasXmlIllegalChars('doc\x0Ctxt')).toBe(true)
      expect(hasXmlIllegalChars('item\x0E')).toBe(true)
      expect(hasXmlIllegalChars('\x1Fdata')).toBe(true)
    })

    it('returns false for valid XML characters including tab, line feed, carriage return', () => {
      expect(hasXmlIllegalChars('normal-file.txt')).toBe(false)
      expect(hasXmlIllegalChars('file with spaces.png')).toBe(false)
      expect(hasXmlIllegalChars('hello\tworld')).toBe(false)
      expect(hasXmlIllegalChars('hello\nworld')).toBe(false)
      expect(hasXmlIllegalChars('hello\rworld')).toBe(false)
      expect(hasXmlIllegalChars('unicode/🌟/path')).toBe(false)
    })
  })

  describe('encodeS3Key', () => {
    it('encodes special characters and spaces using encodeURIComponent', () => {
      expect(encodeS3Key('hello world.txt')).toBe('hello%20world.txt')
      expect(encodeS3Key('a&b=c?d')).toBe('a%26b%3Dc%3Fd')
      expect(encodeS3Key('folder/file.txt')).toBe('folder%2Ffile.txt')
    })
  })

  describe('planListingEncoding', () => {
    it('returns "encode" when encodingType is "url", regardless of content', () => {
      expect(planListingEncoding(['plain.txt'], 'url')).toBe('encode')
      expect(planListingEncoding(['bad\x00char.txt'], 'url')).toBe('encode')
    })

    it('returns "reject" when encodingType is not "url" and illegal chars are present', () => {
      expect(planListingEncoding(['bad\x07char.txt'], null)).toBe('reject')
      expect(planListingEncoding(['ok.txt', 'bad\x01.txt'], undefined as unknown as string | null)).toBe('reject')
    })

    it('returns "plain" when encodingType is not "url" and all chars are valid', () => {
      expect(planListingEncoding(['file1.txt', 'folder/file2.txt'], null)).toBe('plain')
      expect(planListingEncoding(['valid\tname.txt'], null)).toBe('plain')
      expect(planListingEncoding([], null)).toBe('plain')
    })
  })
})
