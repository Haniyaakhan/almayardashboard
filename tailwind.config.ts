import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Existing timesheet tokens (preserved) ──
        'timesheet-border': '#c8a055',
        'timesheet-bg':     '#fffacd',
        'friday-highlight': '#ffcc00',
        'header-bg':        '#e8762b94',
        // ── Platform dark theme ──
        canvas:   '#0f1117',
        sidebar:  '#1a1f2e',
        card:     '#1e2336',
        'card-border': '#2d3454',
        accent:   '#e8762b',
        'accent-hover':  '#d4691f',
        'accent-light':  'rgba(232,118,43,0.15)',
      },
      fontSize: {
        'xxs':      '7px',
        'xs-plus':  '8px',
        'sm-minus': '11px',
      },
      width:     { 'a4': '210mm' },
      minHeight: { 'a4': '297mm' },
    },
  },
  plugins: [],
};

export default config;
