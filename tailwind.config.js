/** @type {import('tailwindcss').Config} */
const nativewind = require('nativewind/preset');

module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './index.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    // React Native Reusables (shadcn-style components live outside `src`)
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [nativewind],
  theme: {
    extend: {
      // React Native can't read CSS variables from global.css, so we mirror the
      // core shadcn-style design tokens here with concrete values. This lets
      // Reusables components (e.g. Card) render the correct surfaces on native.
      colors: {
        background: '#f1f5f9',
        foreground: '#020617',

        card: '#ffffff',
        'card-foreground': '#020617',

        popover: '#ffffff',
        'popover-foreground': '#020617',

        primary: '#1f5226',
        'primary-foreground': '#f9fafb',

        secondary: '#e5e7eb',
        'secondary-foreground': '#020617',

        muted: '#e5e7eb',
        'muted-foreground': '#4b5563',

        accent: '#1f5226',
        'accent-foreground': '#ecfdf3',

        destructive: '#b91c1c',
        'destructive-foreground': '#fef2f2',

        border: '#e5e7eb',
        input: '#e5e7eb',
        ring: '#16a34a',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};



