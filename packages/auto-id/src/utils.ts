import { ObjectIdentifier } from 'asn1js'

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

// import { Convert } from 'pvtsutils'
// export function derEncodeSignatureAlgorithmOID2(oid: string): Uint8Array {
//   // Convert the OID string to a byte array
//   const oidBytes = new Uint8Array(Convert.FromHex(oid))

//   // DER encoding for NULL
//   const nullParameter = new Uint8Array([0x05, 0x00])

//   // Calculate the total length including OID and NULL parameter
//   const totalLength = oidBytes.byteLength + nullParameter.length + 2 // +2 for the type and length bytes of the OID

//   // 0x30 is the DER tag for SEQUENCE
//   const sequenceHeader = new Uint8Array([0x30, totalLength])

//   return new Uint8Array([
//     ...sequenceHeader,
//     0x06,
//     oidBytes.byteLength,
//     ...oidBytes,
//     ...nullParameter,
//   ])
// }

export function addDaysToCurrentDate(days: number): Date {
  const currentDate = new Date() // This gives you the current date and time
  currentDate.setUTCDate(currentDate.getUTCDate() + days) // Adds the specified number of days
  return currentDate
}
