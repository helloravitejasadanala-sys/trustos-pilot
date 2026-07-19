import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['var(--font-fraunces)', 'Fraunces', 'Georgia', 'serif'],
      },
      colors: {
        // Neutral scale — Notion/Linear inspired
        ink: {
          50: '#fafafa', 100: '#f5f5f5', 200: '#e5e5e5', 300: '#d4d4d4',
          400: '#a3a3a3', 500: '#737373', 600: '#525252', 700: '#404040',
          800: '#262626', 900: '#171717', 950: '#0a0a0a',
        },
        // Sage — calm green for success/actions
        sage: {
          50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac',
          400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d',
          800: '#166534', 900: '#14532d',
        },
        // Clay — warm accent
        clay: {
          50: '#faf6f3', 100: '#f0e6dd', 200: '#e2cfc0', 300: '#d4b8a3',
          400: '#c49a7a', 500: '#b57d5a', 600: '#9a6545', 700: '#7d5039',
        },
        // Forest — the single accent. Deep, trustworthy green (growth,
        // not terracotta). Used sparingly for primary actions + marks.
        forest: {
          50: '#f0f5f2', 100: '#dbe8e0', 200: '#b9d3c4', 300: '#8db8a1',
          400: '#5e9578', 500: '#3d7659', 600: '#2c5d45', 700: '#244b38',
          800: '#1e3c2e', 900: '#1a3227', 950: '#0d1c16',
        },
        // Paper — warm off-white canvas, calmer than pure sand.
        paper: {
          DEFAULT: '#f6f3ec', 50: '#faf8f3', 100: '#f6f3ec', 200: '#ece7db',
        },
        // Sand — backgrounds
        sand: {
          50: '#fafaf9', 100: '#f5f5f4', 200: '#e7e5e4', 300: '#d6d3d1',
          400: '#a8a29e', 500: '#78716c', 600: '#57534e', 700: '#44403c',
        },
      },
      borderRadius: {
        'card': '16px',
        'input': '12px',
        'chip': '9999px',
        'button': '12px',
      },
      boxShadow: {
        'soft': '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        'card': '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        'elevated': '0 4px 12px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.03)',
        'float': '0 8px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
      },
      fontSize: {
        '2xs': '10px',
      },
    },
  },
  plugins: [],
};

export default config;
