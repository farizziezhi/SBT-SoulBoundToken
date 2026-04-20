/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
        mono: ['"Space Mono"', 'monospace'],
      },
      colors: {
        institutional: '#B45309', // amber-700
      }
    },
  },
  plugins: [],
}
