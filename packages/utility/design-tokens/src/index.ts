/**
 * Auto Design Tokens
 *
 * This is the main entry point for the design tokens library.
 * It exports all the tokens from the tokens directory.
 */

import { convertTokens } from './generate-token'
export const autoTokens = convertTokens()

/**
 * Example of how to use this in tailwind.config.ts:
 *
 * import { autoTokens } from '@autonomys/design-tokens';
 *
 * export default {
 *   theme: {
 *     extend: autoTokens,
 *   },
 * }
 */
