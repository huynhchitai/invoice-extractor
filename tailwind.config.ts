import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper:    'var(--paper)',
        grid:     'var(--grid)',
        ink:      'var(--ink)',
        'ink-soft': 'var(--ink-soft)',
        'ink-quiet': 'var(--ink-quiet)',
        ledger:   'var(--ledger)',
        'ledger-light': 'var(--ledger-light)',
        'ledger-rule': 'var(--ledger-rule)',
        debit:    'var(--debit)',
        rule:     'var(--rule)',
        'rule-soft': 'var(--rule-soft)',
        amber:    'var(--amber)',
        surface:  'var(--surface)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        body:    ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
