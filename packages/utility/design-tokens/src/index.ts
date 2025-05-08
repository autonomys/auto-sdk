/**
 * Auto Design Tokens
 * 
 * This is the main entry point for the design tokens library.
 * It exports all the tokens from the tokens directory.
 */

import colors from './tokens/colors';
import typography from './tokens/typography';
import spacing from './tokens/spacing';
import shadows from './tokens/shadows';

// Export individual token groups
export { colors, typography, spacing, shadows };

// Export all tokens as a single object
export default {
  colors,
  typography,
  spacing,
  shadows,
}; 