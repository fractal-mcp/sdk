export default {
  plugins: {
    '@tailwindcss/postcss': {
      content: [
        './index.html',
        './src/**/*.{js,ts,jsx,tsx}',
      ],
    },
    autoprefixer: {},
  },
}