/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0B0F', // Deep space black
        surface: '#18181B',    // Zinc 900
        primary: '#4F94FF',    // Vivid Google Blue
        secondary: '#A8C7FA',  // Lighter Blue
        'gemini-purple': '#D965FF', // Accent
        danger: '#FF8989',     // Accessible Red
      },
      boxShadow: {
        'glow': '0 0 20px -5px rgba(79, 148, 255, 0.4)',
        'glow-lg': '0 0 40px -10px rgba(79, 148, 255, 0.5)',
      },
      fontFamily: {
        sans: ['"Outfit"', '"Google Sans"', 'Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
