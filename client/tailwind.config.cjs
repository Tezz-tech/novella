/** Tailwind uses the shared Novelle Tech brand preset (colours, fonts, glows, keyframes). */
module.exports = {
  presets: [require('../brand/tailwind.preset.cjs')],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      borderRadius: {
        pill: '999px',
        card: '20px',
      },
      height: { 13: '3.25rem' },
    },
  },
  plugins: [],
};
