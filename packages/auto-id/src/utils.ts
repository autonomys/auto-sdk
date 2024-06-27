import { compactAddLength } from '@polkadot/util'
import { ObjectIdentifier } from 'asn1js'

/**
 * Encodes a given string representation of an OID into its DER format,
 * and then applies SCALE encoding by prepending the length of the DER-encoded data in compact format.
 *
 * @param oid The string representation of the ObjectIdentifier to be encoded.
 * @returns Uint8Array containing the SCALE encoded, DER-encoded OID with appended NULL parameter.
 */
export function derEncodeSignatureAlgorithmOID(oid: string): Uint8Array {
  const objectIdentifier = new ObjectIdentifier({ value: oid })
  const oidEncoded = objectIdentifier.toBER(false)

  // Typically, in X.509, the algorithm identifier is followed by parameters; for many algorithms, this is just NULL.
  const nullParameter = [0x05, 0x00] // DER encoding for NULL

  // Calculate the total length including OID and NULL parameter
  const totalLength = oidEncoded.byteLength + nullParameter.length

  // Construct the sequence header
  const sequenceHeader = [0x30] // 0x30 is the DER tag for SEQUENCE
  if (totalLength < 128) {
    sequenceHeader.push(totalLength) // Short form length
  } else {
    // Long form length encoding
    const lengthBytes = []
    let tempLength = totalLength
    while (tempLength > 0) {
      lengthBytes.push(tempLength & 0xff)
      tempLength >>= 8
    }
    sequenceHeader.push(0x80 | lengthBytes.length, ...lengthBytes.reverse())
  }

  // Combine the sequence header, OID, and NULL parameter into one Uint8Array
  const derSequence = new Uint8Array(
    sequenceHeader.length + oidEncoded.byteLength + nullParameter.length,
  )
  derSequence.set(sequenceHeader, 0)
  derSequence.set(new Uint8Array(oidEncoded), sequenceHeader.length)
  derSequence.set(nullParameter, sequenceHeader.length + oidEncoded.byteLength)

  // Apply SCALE encoding by prepending the compact length of the entire DER sequence
  return compactAddLength(derSequence)
}

// CLEANUP: Remove later when all registry functionalities work.
// /**
//  * Encodes a given string representation of an OID into its DER format.
//  * This function is specifically used to encode signature algorithm OIDs.
//  *
//  * @param oid The string representation of the ObjectIdentifier to be encoded.
//  * @returns Uint8Array containing the DER encoded OID along with NULL params of X.509 signature algorithm.
//  */
// export function derEncodeSignatureAlgorithmOID(oid: string): Uint8Array {
//   const objectIdentifier = new ObjectIdentifier({ value: oid })
//   const berArrayBuffer = objectIdentifier.toBER(false)

//   // Typically, in X.509, the algorithm identifier is followed by parameters; for many algorithms, this is just NULL.
//   const nullParameter = [0x05, 0x00] // DER encoding for NULL

//   // Calculate the total length including OID and NULL parameter
//   const totalLength = berArrayBuffer.byteLength + nullParameter.length

//   const sequenceHeader = [0x30, totalLength] // 0x30 is the DER tag for SEQUENCE

//   return new Uint8Array([...sequenceHeader, ...new Uint8Array(berArrayBuffer), ...nullParameter])
// }

export function addDaysToCurrentDate(days: number): Date {
  const currentDate = new Date() // This gives you the current date and time
  currentDate.setUTCDate(currentDate.getUTCDate() + days) // Adds the specified number of days
  return currentDate
}
