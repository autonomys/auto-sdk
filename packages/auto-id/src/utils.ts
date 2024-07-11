import { AsnConvert, OctetString } from '@peculiar/asn1-schema'
import { AlgorithmIdentifier as AsnAlgorithmIdentifier } from '@peculiar/asn1-x509'

/**
 * Encodes a given string representation of an OID into its DER format,
 * appropriately handling the parameters.
 *
 * @param oid The string representation of the ObjectIdentifier to be encoded.
 * @param parameters Optional parameters, null if no parameters.
 * @returns Uint8Array containing the DER-encoded OID with appended parameters.
 */
export function derEncodeSignatureAlgorithmOID(
  oid: string,
  parameters: ArrayBuffer | null = null,
): Uint8Array {
  // Create an instance of AlgorithmIdentifier with proper handling of parameters
  const algorithmIdentifier = new AsnAlgorithmIdentifier({
    algorithm: oid,
    parameters: parameters ? AsnConvert.serialize(new OctetString(parameters)) : null,
  })

  // Convert the entire AlgorithmIdentifier to DER
  const derEncoded = AsnConvert.serialize(algorithmIdentifier)

  // Return the resulting DER-encoded data
  return new Uint8Array(derEncoded)
}

export function addDaysToCurrentDate(days: number): Date {
  const currentDate = new Date() // This gives you the current date and time
  currentDate.setUTCDate(currentDate.getUTCDate() + days) // Adds the specified number of days
  return currentDate
}
