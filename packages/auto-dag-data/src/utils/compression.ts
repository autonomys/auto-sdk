/**
 * Returns true only if `buffer` begins with a structurally valid zlib stream
 * header (RFC 1950):
 *   - CM (low nibble of CMF) === 8 (DEFLATE compression method)
 *   - CINFO (high nibble of CMF) <= 7 (window size <= 32K)
 *   - (CMF * 256 + FLG) % 31 === 0 (FCHECK header checksum)
 *
 * fflate's `Zlib` (used by `compressFile`) always produces this wrapper, so a
 * genuinely-compressed first chunk will pass. Plaintext (PNG, JSON, etc.) and
 * raw headerless DEFLATE will not.
 *
 * This is a pure, synchronous predicate with no Node-only dependencies, so it
 * works in both browser and Node environments. It only inspects the first two
 * bytes and never buffers or copies the input.
 *
 * @param buffer - the bytes to inspect (e.g. the first stored chunk of a file)
 * @returns whether the bytes start with a valid zlib stream header
 */
export const isZlibCompressed = (buffer: Uint8Array): boolean => {
  if (buffer.length < 2) return false

  const cmf = buffer[0]
  const flg = buffer[1]

  // CM must be 8 (DEFLATE) and CINFO must be <= 7 (window <= 32K).
  if ((cmf & 0x0f) !== 8 || cmf >> 4 > 7) return false

  // FCHECK: the 16-bit value (CMF << 8 | FLG) must be a multiple of 31.
  return (((cmf << 8) | flg) & 0xffff) % 31 === 0
}
