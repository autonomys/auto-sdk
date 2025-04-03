// file: src/string.ts

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const stringify = (value: any) =>
  JSON.stringify(value, (_, value) => (typeof value === 'bigint' ? value.toString() : value))

export const shortString = (value: string, initialLength = 6, endLength = -4): string =>
  `${value.slice(0, initialLength)}...${value.slice(endLength)}`

export const capitalizeFirstLetter = (string: string) =>
  string ? string.charAt(0).toUpperCase() + string.slice(1) : ''

export const fixLengthEntryId = (blockHeight: bigint, indexInBlock?: bigint): string => {
  const totalLength = 32
  const str1 = blockHeight.toString().padStart(totalLength, '0')

  if (indexInBlock === undefined) return str1

  const str2 = indexInBlock.toString().padStart(totalLength, '0')
  return `${str1}-${str2}`
}
