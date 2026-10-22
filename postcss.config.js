// Tells Next.js to run Tailwind when it builds the CSS.
// Without this file, the @tailwind lines in app/globals.css are ignored
// and the site renders with no styling.
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
