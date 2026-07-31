/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#f5f5f5',
        paper: '#ffffff',
        'surface-alt': '#fafafa',
        ink: {
          DEFAULT: '#0a0a0a',
          soft: '#171717',
        },
        mute: '#737373',
        hairline: '#e5e5e5',
        ember: '#e7000b',
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      fontSize: {
        caption: ['12px', { lineHeight: '1.33', letterSpacing: '0.6px' }],
        body: ['14px', { lineHeight: '1.43' }],
        'body-lg': ['16px', { lineHeight: '1.5' }],
        subheading: ['18px', { lineHeight: '1.56' }],
        'heading-sm': ['24px', { lineHeight: '1.33', letterSpacing: '-0.6px' }],
        heading: ['30px', { lineHeight: '1.2', letterSpacing: '-0.75px' }],
        'heading-lg': ['36px', { lineHeight: '1.11', letterSpacing: '-0.9px' }],
      },
      borderRadius: {
        card: '24px',
        pill: '18px',
        nested: '10px',
        micro: '6px',
      },
      maxWidth: {
        page: '1280px',
      },
      boxShadow: {
        card:
          '0 0 0 1px rgba(23, 23, 23, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
      },
      spacing: {
        4.5: '18px',
        5: '20px',
      },
    },
  },
  plugins: [],
};
