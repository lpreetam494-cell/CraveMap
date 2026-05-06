/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        background: '#FAFAFC',
        surface: '#FFFFFF',
        primary: '#007AFF',
        textMain: '#1C1C1E',
        textSub: '#8E8E93',
        borderLight: '#E5E5EA',
      },
      boxShadow: {
        'apple-soft': '0 4px 24px rgba(0, 0, 0, 0.04)',
        'apple-hover': '0 8px 32px rgba(0, 0, 0, 0.08)',
      },
      borderRadius: {
        'xl': '16px',
        '2xl': '24px',
      }
    },
  },
  plugins: [],
}
