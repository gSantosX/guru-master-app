/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neon: {
          cyan: 'rgb(var(--neon-cyan) / <alpha-value>)',
          pink: 'rgb(var(--neon-pink) / <alpha-value>)',
          purple: 'rgb(var(--neon-purple) / <alpha-value>)',
        },
        dark: {
          DEFAULT: 'rgb(var(--bg-dark) / <alpha-value>)',
          lighter: 'rgb(var(--bg-dark-lighter) / <alpha-value>)',
          card: 'rgb(var(--bg-dark-card) / <alpha-value>)'
        },
        white: 'rgb(var(--color-white) / <alpha-value>)',
        gray: {
          100: 'rgb(var(--color-gray-100) / <alpha-value>)',
          200: 'rgb(var(--color-gray-200) / <alpha-value>)',
          300: 'rgb(var(--color-gray-300) / <alpha-value>)',
          400: 'rgb(var(--color-gray-400) / <alpha-value>)',
          500: 'rgb(var(--color-gray-500) / <alpha-value>)',
          600: 'rgb(var(--color-gray-600) / <alpha-value>)',
          700: 'rgb(var(--color-gray-700) / <alpha-value>)',
          800: 'rgb(var(--color-gray-800) / <alpha-value>)',
          900: 'rgb(var(--color-gray-900) / <alpha-value>)',
        }
      },
      boxShadow: {
        'neon-cyan': '0 0 10px rgba(0, 243, 255, 0.5), 0 0 20px rgba(0, 243, 255, 0.3)',
        'neon-pink': '0 0 10px rgba(255, 0, 234, 0.5), 0 0 20px rgba(255, 0, 234, 0.3)',
        'neon-purple': '0 0 10px rgba(157, 0, 255, 0.5), 0 0 20px rgba(157, 0, 255, 0.3)',
      }
    },
  },
  plugins: [],
}
