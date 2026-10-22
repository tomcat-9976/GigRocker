/** @type {import('tailwindcss').Config} */
module.exports = {
  // Tailwind only generates the classes it finds in these files.
  // If you add a new top-level folder with components, add it here.
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './lib/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
