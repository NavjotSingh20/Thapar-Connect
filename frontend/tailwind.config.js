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
        // Ground-truth palette mapping (eliminates rogue maroon/crimson/gold)
        thapar: {
          50: '#F6F7F5',
          100: '#E6E9E3',
          200: '#B7BEB2',
          300: '#9fa899',
          400: '#A3D65C',
          500: '#92c949',
          600: '#323930',
          700: '#20251F', // Ground truth primary charcoal
          800: '#171b16',
          900: '#0f120e',
          950: '#080a07',
        },
        gold: {
          50: '#F6F7F5',
          100: '#E6E9E3',
          200: '#B7BEB2',
          300: '#c5e894',
          400: '#A3D65C', // Ground truth accent lime
          500: '#92c949',
          600: '#7ea83e',
          700: '#5e802a',
          800: '#20251F',
          900: '#141813',
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
