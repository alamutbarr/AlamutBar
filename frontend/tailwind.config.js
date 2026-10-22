/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Vazirmatn', 'Tahoma', 'sans-serif'],
      },
      colors: {
        slate: {
          50: '#f7f6f0',
          100: '#eef2f0',
          200: '#d8e1dc',
          300: '#b7c6c4',
          400: '#8aa0a0',
          500: '#526d70',
          600: '#3e585b',
          700: '#2a4649',
          800: '#17383b',
          900: '#10282b',
          950: '#0c1e21',
        },
        blue: {
          50: '#e7f4f5',
          100: '#d4ecee',
          200: '#a9d8dc',
          300: '#6ebfc6',
          400: '#159a9c',
          500: '#087f8c',
          600: '#087f8c',
          700: '#06656f',
          800: '#17383b',
          900: '#10282b',
        },
        violet: {
          300: '#d7b56d',
        },
        emerald: {
          200: '#c5e4df',
          400: '#159a9c',
          500: '#087f8c',
          600: '#06656f',
        },
      },
      borderRadius: {
        xl: '0.55rem',
        '2xl': '0.7rem',
        '3xl': '0.85rem',
      },
    },
  },
  plugins: [],
};
