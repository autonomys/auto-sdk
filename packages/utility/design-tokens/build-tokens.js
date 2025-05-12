#!/usr/bin/env node

/**
 * build-tokens.js
 * Script to compile TypeScript tokens to JavaScript
 */

import { execSync } from 'child_process'
import fs from 'fs-extra'

console.log('⚙️ Compiling tokens...')

// First, ensure token output directories exist
fs.ensureDirSync('./dist/tokens')

// Compile TypeScript tokens to JavaScript
try {
  // Use the yarn tsc script we added to package.json
  execSync('yarn tsc --project tsconfig.tokens.json', { stdio: 'inherit' })
  console.log('✅ Tokens compiled successfully')

  // Now run the CSS generation script
  try {
    // Import the CSS generation module
    await import('./generate-css.js')
  } catch (cssError) {
    console.error('❌ Error generating CSS:', cssError)
    process.exit(1)
  }
} catch (error) {
  console.error('❌ Error in build process:', error)
  process.exit(1)
}
