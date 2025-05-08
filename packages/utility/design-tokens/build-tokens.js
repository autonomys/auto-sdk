#!/usr/bin/env node

/**
 * build-tokens.js
 * Script to compile TypeScript tokens to JavaScript
 */

import fs from 'fs-extra';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

console.log("⚙️ Compiling tokens...");

// First, ensure token output directories exist
fs.ensureDirSync("./dist/tokens");
fs.ensureDirSync("./dist/css");

// Clean up any existing CSS files in dist
fs.removeSync("./dist/css");
fs.ensureDirSync("./dist/css");

// Compile TypeScript tokens to JavaScript
try {
  // Use the yarn tsc script we added to package.json
  execSync("yarn tsc --project tsconfig.tokens.json", { stdio: 'inherit' });
  console.log("✅ Tokens compiled successfully");
  
  // Now run the CSS generation script
  try {
    // Import the CSS generation module
    await import('./generate-css.js');
  } catch (cssError) {
    console.error("❌ Error generating CSS:", cssError);
    process.exit(1);
  }
} catch (error) {
  console.error("❌ Error in build process:", error);
  process.exit(1);
}
