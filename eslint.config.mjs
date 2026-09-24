import { FlatCompat } from '@eslint/eslintrc'
import js from '@eslint/js'
import typescriptEslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import prettier from 'eslint-plugin-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
})

export default defineConfig([
  globalIgnores([
    '**/node_modules',
    '**/dist',
    '**/scripts',
    '**/jest.config.js',
    '**/jest.config.ts',
    '**/examples',
    '**/.next/',
    '**/out/',
    '**/dist/',
  ]),
  {
    extends: compat.extends(
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended',
      'prettier',
    ),

    plugins: {
      '@typescript-eslint': typescriptEslint,
      prettier,
    },

    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },

    settings: {
      'import/resolver': {
        typescript: {},
      },
    },

    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      camelcase: 'warn',
      'spaced-comment': 'error',
      quotes: ['error', 'single', { avoidEscape: true }],
      'no-duplicate-imports': 'error',
    },
  },
])
