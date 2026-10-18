/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./templates/**/*.html",
    "./static/js/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        'dw-black': '#000000',
        'dw-blue-deep': '#0603B4',
        'dw-blue': '#3A36FF',
        'dw-blue-bright': '#6B68FF',
        'dw-blue-glow': '#8B88FF',
        'dw-white': '#FFFFFF',
        'dw-gray': '#9CA3AF',
        'dw-gray-light': '#D3D3D3',
        'dw-red': '#BB0A1E',
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        amatic: ['"Amatic SC"', 'cursive'],
        mono: ['"Roboto Mono"', 'monospace'],
      },
    }
  },
  plugins: [],
}