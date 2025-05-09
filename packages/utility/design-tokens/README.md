# Auto Design Tokens

A comprehensive design token system for Auto, providing consistent styling across applications.

## Features

- Design tokens prefixed with `auto-` for consistent naming
- Tailwind CSS integration
- Dark theme support
- Drive and Explorer specific styles

## Installation

```bash
npm install @autonomys/design-tokens
# or
yarn add @autonomys/design-tokens
```

## Usage with CSS

```js
// global.css

import '@autonomys/design-tokens/dist/index.css'
```

## Usage with Tailwind CSS

In your `tailwind.config.js` or `tailwind.config.ts` file:

```js
// JavaScript (CommonJS)
/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: require('@autonomys/design-tokens').autoTokens,
  },
}
```

```ts
// TypeScript (ESM)
import type { Config } from 'tailwindcss'
import { autoTokens } from '@autonomys/design-tokens'

const config: Config = {
  theme: {
    extend: autoTokens,
  },
}

export default config
```

## Available Tokens

### Color Tokens

- Drive colors: `auto-drive-primary`, `auto-drive-accent`, etc.
- Explorer colors: `auto-explorer-grayDark`, `auto-explorer-blueAccent`, etc.

### Typography Tokens

- Font families: `auto-sans`, `auto-mono`, `auto-display`, etc.
- Font sizes: `auto-xs`, `auto-sm`, `auto-base`, etc.
- Font weights: `auto-light`, `auto-normal`, `auto-bold`, etc.
- Line heights: `auto-tight`, `auto-normal`, `auto-relaxed`, etc.
- Letter spacings: `auto-tight`, `auto-normal`, `auto-wide`, etc.

### Shadow Tokens

- Box shadows: `auto-sm`, `auto-md`, `auto-lg`, etc.
- Component shadows: `auto-button`, `auto-card`, `auto-modal`, etc.

### Spacing Tokens

- Spacing scale: `auto-1`, `auto-2`, `auto-4`, etc.
- Border radius: `auto-none`, `auto-sm`, `auto-md`, etc.
- Breakpoints: `auto-sm`, `auto-md`, `auto-lg`, etc.

## Using Tokens in Components

```jsx
// Example React component using Tailwind with Auto tokens
function Button({ children }) {
  return (
    <button className='bg-auto-drive-primary text-white hover:bg-auto-drive-primaryHover font-auto-semibold py-2 px-4 rounded-auto-lg shadow-auto-button'>
      {children}
    </button>
  )
}
```

## Building the Tokens

To build the design tokens:

```bash
npm run build
```

This will compile the TypeScript tokens and generate a distribution bundle that can be used in your project.
