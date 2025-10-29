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
        'primary-black': '#000000',
        'primary-white': '#FFFFFF',
        'accent-red': '#DC2626',
        'accent-gold': '#D4AF37',
        'dark-gray': '#1A1A1A',
        'medium-gray': '#2D2D2D'
      },
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #D4AF37 0%, #F7EF8A 100%)',
        'red-gradient': 'linear-gradient(135deg, #DC2626 0%, #F87171 100%)',
      }
    },
  },
  plugins: [],
}