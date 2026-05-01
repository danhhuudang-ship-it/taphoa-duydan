import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 24px rgba(99,102,241,0.45)',
        'glow-lg': '0 0 60px rgba(139,92,246,0.45)',
      },
      backgroundImage: {
        'aurora':
          'radial-gradient(at 0% 0%, rgba(99,102,241,0.35) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(236,72,153,0.30) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(34,211,238,0.30) 0px, transparent 50%), radial-gradient(at 0% 100%, rgba(168,85,247,0.30) 0px, transparent 50%)',
      },
      keyframes: {
        floaty: {
          '0%,100%': { transform: 'translateY(0) translateX(0)' },
          '50%':     { transform: 'translateY(-10px) translateX(4px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        floaty:  'floaty 6s ease-in-out infinite',
        shimmer: 'shimmer 2.4s linear infinite',
        fadeUp:  'fadeUp 0.4s ease-out both',
      },
    },
  },
  plugins: [],
};
export default config;
