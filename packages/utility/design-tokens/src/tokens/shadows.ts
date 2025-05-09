/**
 * Shadow tokens for the Autonomys explorer application
 */

export const shadows = {
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    DEFAULT: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)",
    none: "none",
  
    // Dark mode variants
    darkSm: "0 1px 2px 0 rgba(0, 0, 0, 0.2)",
    darkDefault: "0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px 0 rgba(0, 0, 0, 0.2)",
    darkMd:
      "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)",
    darkLg:
      "0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)",
    darkXl:
      "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
    dark2xl: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
  };
  
  // Common component shadow patterns
  export const componentShadows = {
    button: shadows.md,
    card: shadows.lg,
    modal: shadows.xl,
    dropdown: shadows.lg,
    header: shadows.md,
    tooltip: shadows.lg,
  
    // Dark mode
    buttonDark: shadows.darkMd,
    cardDark: shadows.darkLg,
    modalDark: shadows.darkXl,
    dropdownDark: shadows.darkLg,
    headerDark: shadows.darkMd,
    tooltipDark: shadows.darkLg,
  };
  
  export default {
    shadows,
    componentShadows,
  };
  