# Auto Design System

This package contains React components for the Auto Design System. These components utilize the design tokens from `@autonomys/design-tokens` package to ensure consistent styling across all applications.

## Installation

```bash
yarn add @autonomys/design-system
```

## Usage

```jsx
// Import the components
import { Button, Dropdown } from '@autonomys/design-system';

// Import the styles (required)
import '@autonomys/design-system/dist/styles.css';

function MyComponent() {
  return (
    <div>
      <Button variant="primary">Click Me</Button>
      <Dropdown 
        options={[
          { label: 'Option 1', value: '1' },
          { label: 'Option 2', value: '2' },
        ]}
        onChange={(value) => console.log(value)}
      />
    </div>
  );
}
```

## Storybook

The design system includes Storybook for component documentation and interactive previews.

```bash
# Run Storybook development server
yarn storybook

# Build Storybook for static deployment
yarn build-storybook
```

Visit [http://localhost:6006](http://localhost:6006) when running the development server to view the component library.

## Tailwind CSS Integration

This design system is built with Tailwind CSS and extends the design tokens from `@autonomys/design-tokens`. If you're using Tailwind CSS in your project, you can extend your configuration to use the same design tokens:

```js
// tailwind.config.js
import { colors, spacing, typography } from '@autonomys/design-tokens';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: colors.colors,
      spacing: spacing.spacing,
      borderRadius: spacing.borderRadius,
      fontFamily: typography.fontFamilies,
      fontSize: typography.fontSizes,
      fontWeight: typography.fontWeights,
      lineHeight: typography.lineHeights,
      letterSpacing: typography.letterSpacings,
    },
  },
  plugins: [],
};
```

## Available Components

- **Button**: A versatile button component with various styles and states
- **Dropdown**: A dropdown select component with customizable options

## Development

```bash
# Install dependencies
yarn install

# Build the package
yarn build

# Watch mode for development
yarn dev

# Run Storybook
yarn storybook
``` 