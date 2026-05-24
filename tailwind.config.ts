import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#EBF3FF',
          100: '#C3D9FF',
          200: '#9BC0FF',
          300: '#6DA3FF',
          400: '#4687FF',
          500: '#1A56DB',
          600: '#1444B8',
          700: '#0F3396',
          800: '#0B2473',
          900: '#071851',
        },
        surface: '#F7F9FC',
        'card-border': '#E5E9F0',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
};
export default config;
