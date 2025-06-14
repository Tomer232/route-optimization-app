/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          'orp-blue': '#4E5A60',
          'orp-light-blue': '#B9D6F2',
          'orp-cream': '#fdf0d5',
          'orp-orange': '#e6640e',
          'orp-dark-blue': '#003049',
          'orp-red': '#d62828',
        },
        backgroundImage: {
          'landing': "url('/images/landing page background.png')",
        }
      },
    },
    plugins: [],
  }