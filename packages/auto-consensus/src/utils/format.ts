// Binary format (powers of 2)
export const formatSpaceToBinaryAsObject = (
  value: number,
  decimals = 2,
): { value: number; unit: string } => {
  if (value === 0) return { value: 0, unit: 'Bytes' }

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']

  const i = Math.floor(Math.log(value) / Math.log(k))

  return { value: parseFloat((value / Math.pow(k, i)).toFixed(dm)), unit: sizes[i] }
}

// Decimal format (powers of 10)
export const formatSpaceToDecimalAsObject = (
  value: number,
  decimals = 2,
): { value: number; unit: string } => {
  if (value === 0) return { value: 0, unit: 'Bytes' }

  const k = 1000
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(value) / Math.log(k))

  return { value: parseFloat((value / Math.pow(k, i)).toFixed(dm)), unit: sizes[i] }
}

// Binary format (powers of 2)
export const formatSpaceToBinary = (value: number, decimals = 2): string => {
  if (value === 0) return '0 Bytes'

  const { value: formattedValue, unit } = formatSpaceToBinaryAsObject(value, decimals)
  return `${formattedValue} ${unit}`
}

// Decimal format (powers of 10)
export const formatSpaceToDecimal = (value: number, decimals = 2): string => {
  if (value === 0) return '0 Bytes'

  const { value: formattedValue, unit } = formatSpaceToDecimalAsObject(value, decimals)
  return `${formattedValue} ${unit}`
}
