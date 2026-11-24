/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        mono: {
          bg: '#F6F7F5',
          surface: '#E6E9E3',
          primary: '#20251F',
          text: '#20251F',
          accent: '#A3D65C',
          'accent-hover': '#92c949',
          secondary: '#B7BEB2',
          border: '#B7BEB2',
        },
        thapar: {
          50: '#fdf2f2',
          100: '#fde8e8',
          200: '#fbd5d5',
          300: '#f8b4b4',
          400: '#f98080',
          500: '#e02424',
          600: '#9b1c1c',
          700: '#800000', // Core Thapar Maroon
          800: '#660000',
          900: '#4A0404', // Deep Thapar Maroon
          950: '#2d0202',
        },
        gold: {
          50: '#fbf8eb',
          100: '#f5eece',
          200: '#ebd999',
          300: '#dfbf61',
          400: '#d4af37', // Metallic Gold Accent
          500: '#b8860b',
          600: '#956908',
          700: '#734d08',
          800: '#5c3d0b',
          900: '#4c330d',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      screens: {
        'xs': '360px',
      },
    },
  },
  plugins: [],
};
