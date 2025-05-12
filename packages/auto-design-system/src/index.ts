/**
 * Auto Design System
 *
 * This is the main entry point for the design system components.
 * It exports all the components from the components directory.
 */

// Import styles (will be processed by build pipeline)
import './styles.css'

// Export utility functions
export { cn } from './lib/cn'

// Export components
// export { default as Button } from './components/astral/Buttons/Button'
export { default as Dropdown } from './components/auto-drive/Dropdown'

// Export Shadcn UI components
// export { buttonVariants, Button as ShadcnButton } from './components/astral/Buttons/Button'
