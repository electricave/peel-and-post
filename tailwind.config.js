/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: '#F7F3EE',
        'cream-dark': '#EDE7DC',
        terracotta: '#C4714A',
        'terracotta-light': '#D98A65',
        'terracotta-pale': '#F2E0D5',
        brown: '#4A3728',
        'brown-mid': '#7A5C48',
        'brown-light': '#A8896E',
        sage: '#7A8C6E',
        'sage-light': '#B5C4A8',
        'sage-pale': '#E8EDE4',
        gold: '#C9A84C',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Lato', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
