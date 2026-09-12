/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#77A719',
        'primary-bright': '#95CC29',
        'primary-tint': '#E7F2D2',
        ink: '#0A0A0A',
        slate: '#F3F4F6',
        border: '#E5E7EB',
        muted: '#6B7280',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        card: '1.25rem',   // 20px
        pill: '9999px',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

