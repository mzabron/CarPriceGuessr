/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        '2xl': '1536px',
        '3xl': '1920px', // Full HD
        '4xl': '2560px', // 2K
        '5xl': '3840px', // 4K
      },
      spacing: {
        '128': '32rem',
        '144': '36rem',
        '68': '17rem',
      },
      maxHeight: {
        '1/4': '25vh',
        '1/2': '50vh',
        '3/4': '75vh',
      },
    },
  },
  plugins: [],
}