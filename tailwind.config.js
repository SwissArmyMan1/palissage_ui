/** @type {import('tailwindcss').Config} */

// Utilities resolve to semantic (tier 2) custom properties only. Primitive
// stops and raw hex are deliberately not reachable from a class name.
const v = (name) => `var(--color-${name})`;

export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        page: v('page'),
        surface: {
          DEFAULT: v('surface'),
          raised: v('surface-raised'),
          overlay: v('surface-overlay'),
          sunken: v('surface-sunken'),
          selected: v('surface-selected'),
          disabled: v('surface-disabled'),
        },
        edge: {
          subtle: v('border-subtle'),
          strong: v('border-strong'),
          field: v('border-field'),
          disabled: v('border-disabled'),
        },
        ink: {
          DEFAULT: v('text-primary'),
          secondary: v('text-secondary'),
          muted: v('text-muted'),
          disabled: v('text-disabled'),
          onaccent: v('text-on-accent'),
        },
        accent: {
          DEFAULT: v('accent'),
          hover: v('accent-hover'),
          pressed: v('accent-pressed'),
          subtle: v('accent-subtle'),
        },
        success: { DEFAULT: v('success'), subtle: v('success-subtle') },
        warning: { DEFAULT: v('warning'), subtle: v('warning-subtle') },
        danger: { DEFAULT: v('danger'), subtle: v('danger-subtle') },
        info: { DEFAULT: v('info'), subtle: v('info-subtle') },
        chain: { DEFAULT: v('chain-network'), subtle: v('chain-network-subtle') },
        ring: v('focus-ring'),
      },
      fontFamily: {
        display: ['var(--font-display)'],
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      fontSize: {
        display: ['var(--text-display)', { lineHeight: '1.04', letterSpacing: '-0.03em' }],
        h1: ['var(--text-h1)', { lineHeight: '1.12', letterSpacing: '-0.02em' }],
        h2: ['var(--text-h2)', { lineHeight: '1.2', letterSpacing: '-0.015em' }],
        h3: ['var(--text-h3)', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
        body: ['var(--text-body)', { lineHeight: '1.55' }],
        'body-sm': ['var(--text-body-sm)', { lineHeight: '1.5' }],
        caption: ['var(--text-caption)', { lineHeight: '1.4', letterSpacing: '0.04em' }],
        mono: ['var(--text-mono)', { lineHeight: '1.45' }],
      },
      spacing: {
        0.5: 'var(--space-2)',
        1: 'var(--space-4)',
        2: 'var(--space-8)',
        3: 'var(--space-12)',
        4: 'var(--space-16)',
        6: 'var(--space-24)',
        8: 'var(--space-32)',
        12: 'var(--space-48)',
        16: 'var(--space-64)',
        24: 'var(--space-96)',
        32: 'var(--space-128)',
      },
      borderRadius: {
        xs: 'var(--radius-2)',
        sm: 'var(--radius-4)',
        DEFAULT: 'var(--radius-8)',
        md: 'var(--radius-8)',
        lg: 'var(--radius-12)',
        xl: 'var(--radius-16)',
        full: 'var(--radius-full)',
      },
      boxShadow: {
        1: 'var(--shadow-1)',
        2: 'var(--shadow-2)',
        3: 'var(--shadow-3)',
        none: 'none',
      },
      maxWidth: {
        content: 'var(--content-max)',
        reading: '65ch',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
        in: 'var(--ease-in)',
        'in-out': 'var(--ease-in-out)',
      },
      transitionDuration: {
        instant: 'var(--duration-instant)',
        fast: 'var(--duration-fast)',
        base: 'var(--duration-base)',
        slow: 'var(--duration-slow)',
      },
      screens: {
        xs: '480px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1440px',
      },
    },
  },
  plugins: [],
};
