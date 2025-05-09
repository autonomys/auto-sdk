import { autoTokens } from '@autonomys/design-tokens'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      ...autoTokens,
    },
  },
  safelist: [
    { pattern: /^(text|font|bg|shadow|m|p|rounded|w|h)-auto-/ }, // All auto prefix classes
    { pattern: /^text-auto-(drive|explorer)-/ }, // App-specific text colors
  ],
  plugins: [],
}
