import {
  ASN1Construction,
  ASN1TagClass,
  ASN1UniversalType,
  DERElement,
  ObjectIdentifier,
} from 'asn1-ts'

/**
 * Represents an ASN.1 AlgorithmIdentifier structure commonly used in cryptographic protocols.
 * This class handles the construction and DER encoding of an algorithm identifier, which typically
 * consists of an algorithm OID and optional parameters.
 */
class AlgorithmIdentifier {
  public algorithm: ObjectIdentifier
  public parameters: null

  /**
   * Creates an instance of AlgorithmIdentifier.
   *
   * @param algorithm The ObjectIdentifier of the algorithm.
   * @param parameters The parameters of the algorithm, generally null in many cryptographic uses.
   */
  constructor(algorithm: ObjectIdentifier, parameters: null = null) {
    this.algorithm = algorithm
    this.parameters = parameters
  }

  /**
   * Encodes this AlgorithmIdentifier into its DER (Distinguished Encoding Rules) format.
   *
   * @returns Uint8Array containing the DER encoded bytes of the AlgorithmIdentifier.
   */
  public toDER(): Uint8Array {
    const sequenceElement = new DERElement(
      ASN1TagClass.universal,
      ASN1Construction.constructed,
      ASN1UniversalType.sequence,
    )

    const oidElement = new DERElement(
      ASN1TagClass.universal,
      ASN1Construction.primitive,
      ASN1UniversalType.objectIdentifier,
    )
    oidElement.objectIdentifier = this.algorithm

    const nullElement = new DERElement(
      ASN1TagClass.universal,
      ASN1Construction.primitive,
      ASN1UniversalType.nill,
    )

    sequenceElement.sequence = [oidElement, nullElement]

    return sequenceElement.toBytes()
  }
}

/**
 * Encodes a given string representation of an OID into its DER format.
 * This function is specifically used to encode signature algorithm OIDs.
 *
 * @param oid The string representation of the ObjectIdentifier to be encoded.
 * @returns Uint8Array containing the DER encoded OID.
 * @example
 * ```ts
 * const oid = '1.2.840.113549.1.1.11' // Example OID for SHA-256 with RSA Encryption
 * const derEncodedOID = derEncodeSignatureAlgorithmOID(oid)
 * console.log(new Uint8Array(derEncodedOID)) // Logs the DER encoded bytes
 * ```
 */
export function derEncodeSignatureAlgorithmOID(oid: string): Uint8Array {
  const numbers = oid.split('.').map((n) => parseInt(n, 10)) // Convert the string parts to numbers
  const algorithmIdentifier = new AlgorithmIdentifier(new ObjectIdentifier(numbers))
  return algorithmIdentifier.toDER()
}
