import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'Hanken Grotesk', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['var(--font-display)', 'Instrument Serif', 'Georgia', 'serif'],
      },
      colors: {
        // Semantic aliases → Phase 1 tokens (avoid key name "border" — clashes with utilities)
        canvas: 'var(--canvas)',
        surface: 'var(--panel)',
        fg: {
          DEFAULT: 'var(--ink)',
          muted: 'var(--muted)',
        },
        line: {
          DEFAULT: 'var(--line)',
          soft: 'var(--line-soft)',
        },
        primary: {
          DEFAULT: 'var(--forest)',
          fg: '#ffffff',
        },
        // Palette — Notion/Linear inspired neutrals + studio forest accent
        ink: {
          50: '#fafafa', 100: '#f5f5f5', 200: '#e5e5e5', 300: '#d4d4d4',
          400: '#a3a3a3', 500: '#737373', 600: '#525252', 700: '#404040',
          800: '#262626', 900: '#171717', 950: '#0a0a0a',
        },
        sage: {
          50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac',
          400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d',
          800: '#166534', 900: '#14532d',
        },
        clay: {
          50: '#faf6f3', 100: '#f0e6dd', 200: '#e2cfc0', 300: '#d4b8a3',
          400: '#c49a7a', 500: '#b57d5a', 600: '#9a6545', 700: '#7d5039',
        },
        forest: {
          50: '#f0f5f2', 100: '#dbe8e0', 200: '#b9d3c4', 300: '#8db8a1',
          400: '#5e9578', 500: '#3d7659', 600: '#2c5d45', 700: '#244b38',
          800: '#1e3c2e', 900: '#1a3227', 950: '#0d1c16',
        },
        paper: {
          DEFAULT: '#f6f3ec', 50: '#faf8f3', 100: '#f6f3ec', 200: '#ece7db',
        },
        sand: {
          50: '#fafaf9', 100: '#f5f5f4', 200: '#e7e5e4', 300: '#d6d3d1',
          400: '#a8a29e', 500: '#78716c', 600: '#57534e', 700: '#44403c',
        },
      },
      borderRadius: {
        card: 'var(--radius-card)',
        input: 'var(--radius-input)',
        chip: 'var(--radius-chip)',
        button: 'var(--radius-button)',
      },
      boxShadow: {
        soft: 'var(--shadow-soft)',
        card: 'var(--shadow-card)',
        elevated: 'var(--shadow-elevated)',
        float: 'var(--shadow-float)',
      },
      spacing: {
        page: 'var(--page-px)',
        'page-y': 'var(--page-py)',
      },
      fontSize: {
        '2xs': '10px',
      },
      minHeight: {
        control: 'var(--control-min-h)',
      },
    },
  },
  plugins: [],
};

export default config;
