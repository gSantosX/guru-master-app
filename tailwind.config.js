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
          cyan: '#00f3ff',
          pink: '#ff00ea',
          purple: '#9d00ff',
        },
        dark: {
          DEFAULT: '#0a0a0f',
          lighter: '#12121c',
          card: '#1a1a24'
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
