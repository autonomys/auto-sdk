/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "../**/src/**/*.{js,jsx,ts,tsx}",  // Look for content in sibling packages
  ],
  darkMode: 'class', // or 'media'
  theme: {
    extend: {
      colors: {
        // We'll load these dynamically from our tokens
      },
      fontFamily: {
        // We'll load these dynamically from our tokens
      },
      spacing: {
        // We'll load these dynamically from our tokens
      },
      boxShadow: {
        // We'll load these dynamically from our tokens
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
} 