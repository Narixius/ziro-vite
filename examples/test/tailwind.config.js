/** @type {import('tailwindcss').Config} */
export default {
  content: ['./**/*.{html,js,jsx,ts,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/typography')({
      className: 'typography',
    }),
  ],
}
