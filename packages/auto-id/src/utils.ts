import { ObjectIdentifier } from 'asn1js'
import { randomBytes } from 'crypto'

/**
 * Encodes a given string representation of an OID into its DER format.
 * This function is specifically used to encode signature algorithm OIDs.
 *
 * @param oid The string representation of the ObjectIdentifier to be encoded.
 * @returns Uint8Array containing the DER encoded OID along with NULL params of X.509 signature algorithm.
 */
export function derEncodeSignatureAlgorithmOID(oid: string): Uint8Array {
  const objectIdentifier = new ObjectIdentifier({ value: oid })
  const berArrayBuffer = objectIdentifier.toBER(false)

  // Typically, in X.509, the algorithm identifier is followed by parameters; for many algorithms, this is just NULL.
  const nullParameter = [0x05, 0x00] // DER encoding for NULL

  // Calculate the total length including OID and NULL parameter
  const totalLength = berArrayBuffer.byteLength + nullParameter.length

  const sequenceHeader = [0x30, totalLength] // 0x30 is the DER tag for SEQUENCE

  return new Uint8Array([...sequenceHeader, ...new Uint8Array(berArrayBuffer), ...nullParameter])
}

export function addDaysToCurrentDate(days: number): Date {
  const currentDate = new Date() // This gives you the current date and time
  currentDate.setUTCDate(currentDate.getUTCDate() + days) // Adds the specified number of days
  return currentDate
}
