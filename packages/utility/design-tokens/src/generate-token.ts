import colors from './tokens/colors'
import shadows from './tokens/shadows'
import spacing from './tokens/spacing'
import typography from './tokens/typography'

type TokenValue = string | number | Record<string, any>

/**
 * Add prefix to all token keys
 * @param tokens Object containing design tokens
 * @param prefix Prefix to add to each token key
 * @returns New object with prefixed keys
 */
function addPrefixToTokens(
  tokens: Record<string, TokenValue>,
  prefix: string = 'auto-',
): Record<string, TokenValue> {
  const result: Record<string, TokenValue> = {}

  Object.entries(tokens).forEach(([key, value]) => {
    // If value is an object and not a string/number, recursively add prefix
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[`${prefix}${key}`] = addPrefixToTokens(value as Record<string, TokenValue>, prefix)
    } else {
      result[`${prefix}${key}`] = value
    }
  })

  return result
}

/**
 * Convert all design tokens to a format compatible with Tailwind CSS
 * @returns Object containing all design tokens with 'auto-' prefix
 */
export function convertTokens(): Record<string, any> {
  return {
    colors: {
      ...addPrefixToTokens(colors.drive, 'auto-drive-'),
      ...addPrefixToTokens(colors.explorer, 'auto-explorer-'),
    },

    fontFamily: addPrefixToTokens(typography.fontFamilies),
    fontSize: addPrefixToTokens(typography.fontSizes),
    fontWeight: addPrefixToTokens(typography.fontWeights),
    lineHeight: addPrefixToTokens(typography.lineHeights),
    letterSpacing: addPrefixToTokens(typography.letterSpacings),

    boxShadow: {
      ...addPrefixToTokens(shadows.shadows),
      ...addPrefixToTokens(shadows.componentShadows),
    },

    spacing: addPrefixToTokens(spacing.spacing),
    borderRadius: addPrefixToTokens(spacing.borderRadius),
    screens: addPrefixToTokens(spacing.breakpoints),
    container: {
      center: true,
      padding: '1rem',
      screens: addPrefixToTokens(spacing.containerWidths),
    },
  }
}

export default convertTokens
