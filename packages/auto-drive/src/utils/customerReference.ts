// The format Auto Drive accepts for a customer reference. Checking it before a request
// means every invalid reference fails with this error. Without the check, a character
// above U+00FF or a line break throws a TypeError in `Headers`, and surrounding
// whitespace is trimmed and the reference accepted.
const CUSTOMER_REFERENCE = /^[A-Za-z0-9._:-]{1,128}$/

export const INVALID_CUSTOMER_REFERENCE =
  'Invalid customer reference: use 1 to 128 letters, digits, "-", "_", "." or ":"'

/**
 * Throws if a customer reference is given and isn't in the format the server accepts.
 * `null` counts as no reference, so a JavaScript caller passing a nullable value gets an
 * untagged upload instead of one tagged "null".
 */
export const assertValidCustomerReference = (customerReference?: string | null): void => {
  if (customerReference == null) return
  if (typeof customerReference !== 'string' || !CUSTOMER_REFERENCE.test(customerReference)) {
    throw new Error(INVALID_CUSTOMER_REFERENCE)
  }
}
