/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace'],
      },
      colors: {
        gold: {
          DEFAULT: '#d4a853',
          dim: '#a3842f',
          glow: 'rgba(212, 168, 83, 0.15)',
        },
        noir: {
          DEFAULT: '#09090b',
          elevated: '#18181b',
          card: '#1c1c21',
        },
        verified: '#22c55e',
        revoked: '#ef4444',
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease-out both',
        'fade-up-delayed': 'fadeUp 0.6s ease-out 0.15s both',
        'scan-line': 'scanLine 1.2s ease-out both',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scanLine: {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
    },
  },
  plugins: [],
}
