import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{vue,js,ts}', './nuxt.config.{js,ts}'],
  theme: {
    extend: {
      colors: {
        peach: {
          page: '#FBF6F2',
          canvas: '#E9E1DB',
          surface: '#FFFFFF',
          ink: '#231C18',
          muted: '#8A7F78',
          subtle: '#5C524C',
          label: '#B59C8C',
          border: '#E6DCD3',
          'border-light': '#EFE6DE',
          input: '#FBF7F4',
          accent: '#E8956B',
          'hero-from': '#F4CDA9',
          'hero-via': '#EC9E84',
          'hero-to': '#E07E7A',
        },
        status: {
          pending: '#FBE6D6',
          'pending-fg': '#A85B2A',
          queued: '#DDE8F5',
          'queued-fg': '#3A5F94',
          processing: '#E7DCF2',
          'processing-fg': '#6B4E9E',
          ready: '#D9ECDD',
          'ready-fg': '#3C7A4A',
          error: '#F8DAD9',
          'error-fg': '#B0413C',
        },
      },
      borderRadius: {
        'pl-sm': '12px',
        'pl-md': '14px',
        'pl-lg': '16px',
        'pl-xl': '22px',
        'pl-2xl': '24px',
      },
      boxShadow: {
        'pl-card': '0 10px 34px rgba(80, 40, 20, 0.06)',
        'pl-elevated': '0 16px 40px rgba(80, 40, 20, 0.10)',
        'pl-modal': '0 24px 60px rgba(35, 20, 10, 0.32)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      height: {
        header: '68px',
      },
      keyframes: {
        'pl-spin': {
          to: { transform: 'rotate(360deg)' },
        },
        'pl-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
      },
      animation: {
        'pl-spin': 'pl-spin 0.7s linear infinite',
        'pl-pulse': 'pl-pulse 2s ease-in-out infinite',
      },
    },
  },
} satisfies Config;
