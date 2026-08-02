import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#F5F5F4',
        foreground: '#1A1A1A',
        brand: {
          DEFAULT: '#16A34A',
          light: '#22C55E',
        },
        warning: '#F59E0B',
        danger: '#EF4444',
      },
      borderRadius: {
        card: '20px',
      },
    },
  },
  plugins: [],
};

export default config;
