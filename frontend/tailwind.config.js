/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        midnight: '#050714',
        accent: '#00f5d4',
        subtle: '#1c1f2b',
      },
      boxShadow: {
        card: '0 20px 45px rgba(13, 20, 34, 0.35)',
      },
    },
  },
  plugins: [],
};
