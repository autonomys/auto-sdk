/**
 * Auto Design Spacing Tokens
 * 
 * These spacing tokens define the standard spacing values
 * to be used throughout the application for consistent layout.
 */

// Base spacing unit (4px)
export const baseSpacing = 0.25;

// Spacing scale
export const spacing = {
  '0': '0',
  '1': `${baseSpacing * 1}rem`, // 4px
  '2': `${baseSpacing * 2}rem`, // 8px
  '3': `${baseSpacing * 3}rem`, // 12px
  '4': `${baseSpacing * 4}rem`, // 16px
  '5': `${baseSpacing * 5}rem`, // 20px
  '6': `${baseSpacing * 6}rem`, // 24px
  '8': `${baseSpacing * 8}rem`, // 32px
  '10': `${baseSpacing * 10}rem`, // 40px
  '12': `${baseSpacing * 12}rem`, // 48px
  '16': `${baseSpacing * 16}rem`, // 64px
  '20': `${baseSpacing * 20}rem`, // 80px
  '24': `${baseSpacing * 24}rem`, // 96px
  '32': `${baseSpacing * 32}rem`, // 128px
  '40': `${baseSpacing * 40}rem`, // 160px
  '48': `${baseSpacing * 48}rem`, // 192px
  '56': `${baseSpacing * 56}rem`, // 224px
  '64': `${baseSpacing * 64}rem`, // 256px
};

// Semantic spacing
export const semanticSpacing = {
  // Component spacing
  componentXS: spacing['1'],   // 4px
  componentSM: spacing['2'],   // 8px
  componentMD: spacing['4'],   // 16px
  componentLG: spacing['6'],   // 24px
  componentXL: spacing['8'],   // 32px
  
  // Layout spacing
  layoutXS: spacing['4'],     // 16px
  layoutSM: spacing['6'],     // 24px
  layoutMD: spacing['8'],     // 32px
  layoutLG: spacing['12'],    // 48px
  layoutXL: spacing['16'],    // 64px
  layout2XL: spacing['24'],   // 96px
  
  // Inset (padding)
  insetXS: spacing['1'],      // 4px
  insetSM: spacing['2'],      // 8px
  insetMD: spacing['4'],      // 16px
  insetLG: spacing['6'],      // 24px
  insetXL: spacing['8'],      // 32px
  
  // Stack (vertical spacing)
  stackXS: spacing['1'],      // 4px
  stackSM: spacing['2'],      // 8px
  stackMD: spacing['4'],      // 16px
  stackLG: spacing['8'],      // 32px
  stackXL: spacing['12'],     // 48px
  
  // Inline (horizontal spacing)
  inlineXS: spacing['1'],     // 4px
  inlineSM: spacing['2'],     // 8px
  inlineMD: spacing['4'],     // 16px
  inlineLG: spacing['6'],     // 24px
  inlineXL: spacing['8'],     // 32px
};

// Breakpoints
export const breakpoints = {
  xs: '0px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// Container max widths
export const containerWidths = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// Border radius values
export const borderRadius = {
  none: '0',
  sm: '0.125rem',     // 2px
  DEFAULT: '0.25rem', // 4px
  md: '0.375rem',     // 6px
  lg: '0.5rem',       // 8px
  xl: '0.75rem',      // 12px
  '2xl': '1rem',      // 16px
  '3xl': '1.5rem',    // 24px
  full: '9999px',
};

export default {
  baseSpacing,
  spacing,
  semanticSpacing,
  breakpoints,
  containerWidths,
  borderRadius,
}; 