/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Manrope"', 'sans-serif'],
        label: ['"Inter"', 'sans-serif'],
      },
      colors: {
        primary: { DEFAULT: '#3d57a7', container: '#8fa7fe', dim: '#304a9a' },
        secondary: { DEFAULT: '#702ae1', container: '#dcc9ff', dim: '#6411d5' },
        tertiary: { DEFAULT: '#006576', container: '#53ddfc', dim: '#005867' },
        surface: {
          DEFAULT: '#f5f7f9',
          dim: '#d0d5d8',
          low: '#eef1f3',
          lowest: '#ffffff',
          high: '#dfe3e6',
          highest: '#d9dde0',
        },
        on: {
          surface: '#2c2f31',
          'surface-variant': '#595c5e',
          primary: '#f1f2ff',
          secondary: '#f8f0ff',
        },
        outline: { DEFAULT: '#747779', variant: '#abadaf' },
        error: { DEFAULT: '#b31b25', container: '#fb5151' },
        verified: '#22c55e',
      },
      borderRadius: {
        card: '0.75rem',
        btn: '9999px',
      },
      boxShadow: {
        ambient: '0px 24px 48px rgba(44, 47, 49, 0.06)',
        'input-glow': '0 0 0 4px rgba(143, 167, 254, 0.3)',
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease-out both',
        'fade-up-d1': 'fadeUp 0.5s ease-out 0.1s both',
        'fade-up-d2': 'fadeUp 0.5s ease-out 0.2s both',
        'fade-up-d3': 'fadeUp 0.5s ease-out 0.3s both',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
