/**
 * generate-css.js
 * Script to generate CSS files from compiled tokens
 */

import fs from 'fs-extra'

console.log('⚙️ Generating CSS files from tokens...')

/**
 * Writes a CSS file with the given content and logs its creation
 * @param {string} filename - Path to the CSS file to create
 * @param {string} content - CSS content to write
 */
function writeTokenCSSFile(filename, content) {
  fs.writeFileSync(filename, content)
  console.log(`Created ${filename}`)
}

/**
 * Recursively generates CSS variables from a token object
 * @param {Object} tokenObj - The token object to process
 * @param {string} prefix - Prefix for the CSS variable (e.g., "color")
 * @param {string} parentKey - Parent key for nested objects
 * @returns {string} Generated CSS variables
 */
function generateCssVariables(tokenObj, prefix = '', parentKey = '') {
  let cssContent = ''

  if (!tokenObj) return cssContent

  Object.entries(tokenObj).forEach(([key, value]) => {
    const fullKey = parentKey ? `${parentKey}-${key}` : key

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // If the value is an object (but not an array), recursively process it
      cssContent += generateCssVariables(value, prefix, fullKey)
    } else {
      // It's a leaf node, generate a CSS variable
      cssContent += `  --${prefix}-${fullKey}: ${value};\n`
    }
  })

  return cssContent
}

/**
 * Main function to generate CSS files from design tokens
 */
async function generateCSS() {
  try {
    // Import the compiled token files using dynamic imports
    const colorsModule = await import('./dist/tokens/colors.js')
    const typographyModule = await import('./dist/tokens/typography.js')
    const spacingModule = await import('./dist/tokens/spacing.js')
    const shadowsModule = await import('./dist/tokens/shadows.js')

    // Extract default exports or use the module directly
    const colors = colorsModule.default || colorsModule
    const typography = typographyModule.default || typographyModule
    const spacing = spacingModule.default || spacingModule
    const shadows = shadowsModule.default || shadowsModule

    /**
     * Generates CSS variables for the :root selector
     * @returns {string} CSS content with all variables
     */
    function generateRootCSS() {
      let cssContent = `/**
 * Auto Design Tokens - Root CSS Variables
 * GENERATED FILE - DO NOT EDIT DIRECTLY
 */

:root {
`
      // Process all token groups
      cssContent += `  /* Color Variables */\n`
      cssContent += generateCssVariables(colors.drive, 'drive')

      cssContent += `\n  /* Semantic Colors (Light Theme) */\n`
      cssContent += generateCssVariables(colors.explorer, 'explorer')

      cssContent += `\n  /* Typography */\n`
      cssContent += generateCssVariables(typography.fontFamilies, 'font-family')

      cssContent += `\n  /* Font Sizes */\n`
      cssContent += generateCssVariables(typography.fontSizes, 'font-size')

      cssContent += `\n  /* Font Weights */\n`
      cssContent += generateCssVariables(typography.fontWeights, 'font-weight')

      cssContent += `\n  /* Line Heights */\n`
      cssContent += generateCssVariables(typography.lineHeights, 'line-height')

      if (typography.letterSpacings) {
        cssContent += `\n  /* Letter Spacing */\n`
        cssContent += generateCssVariables(typography.letterSpacings, 'letter-spacing')
      }

      cssContent += `\n  /* Spacing */\n`
      cssContent += generateCssVariables(spacing.spacing, 'spacing')

      cssContent += `\n  /* Border Radius */\n`
      Object.entries(spacing.borderRadius).forEach(([name, value]) => {
        const key = name === 'DEFAULT' ? 'default' : name.toLowerCase()
        cssContent += `  --radius-${key}: ${value};\n`
      })

      cssContent += `\n  /* Shadows */\n`
      cssContent += generateCssVariables(shadows.shadows, 'shadow')

      cssContent += `\n  /* Component Shadows */\n`
      cssContent += generateCssVariables(shadows.componentShadows, 'shadow')

      cssContent += `}\n`

      return cssContent
    }

    /**
     * Generates all CSS files from tokens
     */
    function generateAllCSS() {
      const rootCSS = generateRootCSS()
      writeTokenCSSFile('./dist/index.css', rootCSS)
    }
    // Generate all CSS files
    generateAllCSS()
  } catch (error) {
    console.error('Error generating CSS:', error)
    process.exit(1)
  }
}

// Execute the CSS generation as an async IIFE
;(async () => {
  await generateCSS()
})()
