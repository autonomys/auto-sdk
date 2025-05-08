/**
 * Auto Design Color Tokens
 *
 * These color tokens are derived from the application's design system
 * and match the Tailwind configuration.
 */

// Base color palette
export const colors = {
  // Brand colors
  primary: "#000000",
  primaryHover: "#101010",
  accent: "#0A8DD0",
  lighterAccent: "#90C2E7",

  // Background colors
  background: "var(--background)",
  foreground: "var(--foreground)",
  backgroundLight: "#EBEFFC",
  backgroundDark: "#3654A6",
  backgroundDarker: "#27355D",
  backgroundDarkest: "#050D26",

  // UI colors
  lightDanger: "#ffcdd2",
  grayButton: "#9EA49F",
  lightGray: "#4E4F54",
  whiteOpaque: "#ffffffb3",

  // Dark mode colors
  darkWhite: "#252525",
  darkWhiteHover: "#353535",
  darkBlack: "#ffffff",
  darkBlackHover: "#808080",
  darkPrimary: "#3654A6",
  darkPrimaryHover: "#4664B6",
  darkAccent: "#0A8DD0",
  darkAccentHover: "#109DD0",

  // Grayscale
  white: "#FFFFFF",
  black: "#000000",
  gray: {
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
    900: "#111827",
  },

  // Semantic colors
  success: "#10B981", // green-500
  error: "#EF4444", // red-500
  warning: "#F59E0B", // amber-500
  info: "#3B82F6", // blue-500
};

// Semantic color mapping
export const semanticColors = {
  // Text colors
  textPrimary: colors.primary,
  textSecondary: colors.gray[600],
  textTertiary: colors.gray[400],
  textDisabled: colors.gray[300],
  textInverse: colors.white,
  textError: colors.error,
  textSuccess: colors.success,
  textWarning: colors.warning,
  textInfo: colors.info,
  textAccent: colors.accent,

  // Background colors
  backgroundPrimary: colors.white,
  backgroundSecondary: colors.gray[50],
  backgroundTertiary: colors.gray[100],
  backgroundError: colors.lightDanger,
  backgroundSuccess: "#ECFDF5", // green-50
  backgroundWarning: "#FFFBEB", // amber-50
  backgroundInfo: "#EFF6FF", // blue-50
  backgroundAccent: "#E0F2FE", // accent light

  // Border colors
  borderPrimary: colors.gray[200],
  borderSecondary: colors.gray[300],
  borderFocus: colors.accent,
  borderError: colors.error,

  // Button colors
  buttonPrimary: colors.primary,
  buttonPrimaryHover: colors.primaryHover,
  buttonSecondary: colors.gray[200],
  buttonSecondaryHover: colors.gray[300],
  buttonAccent: colors.accent,
  buttonAccentHover: colors.lighterAccent,
  buttonDanger: colors.error,
  buttonDangerHover: "#B91C1C", // red-700
  buttonDisabled: colors.gray[300],
};

// Dark mode semantic colors
export const darkSemanticColors = {
  textPrimary: colors.darkBlack,
  textSecondary: colors.darkBlackHover,
  backgroundPrimary: colors.darkWhite,
  backgroundSecondary: colors.darkWhiteHover,
  buttonPrimary: colors.darkPrimary,
  buttonPrimaryHover: colors.darkPrimaryHover,
  buttonAccent: colors.darkAccent,
  buttonAccentHover: colors.darkAccentHover,
};

export const explorerColors = {
  // Grays and Blacks
  grayDark: "#2A2C38",
  grayDarker: "#27355D",
  grayLight: "#EBEFFC",

  // Gradients
  gradientFrom: "#032372",
  gradientVia: "#1949D2",
  gradientTo: "#5373C4",
  gradientToSecondary: "#0C1C43",

  // Whites
  white: "#FFFFFF",
  whiteTransparent: "#ffffff1a",
  whiteOpaque: "#ffffffb3",

  // Pastels
  pastelPurple: "#C2B0EE",
  pastelBlue: "#ABCFEF",
  pastelPink: "#E6ADDC",
  pastelGreen: "#91D3A0",

  // Greens
  greenBright: "#37D058",

  // Primary
  primaryAccent: "#1949D2",

  // Blues
  blueAccent: "#1E254E",
  blueDarkAccent: "#2A345E",
  blueLight: "#EBEFFC",
  blueShade: "#3654A6",
  blueUndertone: "#27355D",

  // Background
  backgroundLight: "#EBEFFC",
  backgroundDark: "#3654A6",
  backgroundDarker: "#27355D",
  backgroundDarkest: "#050D26",

  // Box
  boxLight: "#FFFFFF",
  boxDark: "#2A2C38",

  // Button
  buttonLightFrom: "#032372",
  buttonLightTo: "#5373C4",
  buttonDarkFrom: "#1949D2",
  buttonDarkTo: "#0C1C43",

  // Header
  headerLight: "#FFFFFF",
  headerDark: "#2A2C38",

  // Footer
  footerLight: "#032372",
  footerDark: "#08183E",
};

export const gradients = {
  // Background gradients
  background: {
    dark: `linear-gradient(180deg, ${explorerColors.backgroundDarkest} 0%, ${explorerColors.backgroundDarker} 100%)`,
    light: `linear-gradient(180deg, ${explorerColors.blueLight} 0%, ${explorerColors.blueShade} 100%)`,
  },

  // Button gradients
  button: {
    light: `linear-gradient(90deg, ${explorerColors.buttonLightFrom} 0%, ${explorerColors.buttonLightTo} 100%)`,
    dark: `linear-gradient(90deg, ${explorerColors.buttonDarkFrom} 0%, ${explorerColors.buttonDarkTo} 100%)`,
    hover: {
      light: `linear-gradient(90deg, ${explorerColors.buttonLightFrom} 0%, ${explorerColors.buttonLightTo} 90%)`,
      dark: `linear-gradient(90deg, ${explorerColors.buttonDarkFrom} 0%, ${explorerColors.buttonDarkTo} 90%)`,
    },
  },

  // Card gradients
  card: {
    primary: `linear-gradient(135deg, ${explorerColors.gradientFrom} 0%, ${explorerColors.gradientVia} 50%, ${explorerColors.gradientTo} 100%)`,
    secondary: `linear-gradient(135deg, ${explorerColors.gradientFrom} 0%, ${explorerColors.gradientVia} 50%, ${explorerColors.gradientToSecondary} 100%)`,
  },

  // Header overlay gradients
  headerOverlay: {
    light:
      "linear-gradient(180deg, rgba(235, 239, 252, 0.9) 0%, rgba(235, 239, 252, 0.8) 100%)",
    dark: "linear-gradient(180deg, rgba(5, 13, 38, 0.9) 0%, rgba(39, 53, 93, 0.8) 100%)",
  },

  // Accent gradients
  accent: {
    blue: `linear-gradient(90deg, ${explorerColors.blueAccent} 0%, ${explorerColors.blueDarkAccent} 100%)`,
    purple: `linear-gradient(90deg, ${explorerColors.pastelPurple} 0%, ${explorerColors.pastelPink} 100%)`,
    green: `linear-gradient(90deg, ${explorerColors.pastelGreen} 30%, ${explorerColors.pastelBlue} 100%)`,
  },
};

export default {
  colors,
  semanticColors,
  darkSemanticColors,
  explorerColors,
  gradients,
};
