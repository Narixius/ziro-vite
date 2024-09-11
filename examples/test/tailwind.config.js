/** @type {import('tailwindcss').Config} */
export default {
  content: ['./pages/**/*.{html,js,jsx,ts,tsx}', './components/**/*.{html,js,jsx,ts,tsx}'],
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
