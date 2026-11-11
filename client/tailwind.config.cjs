/** Tailwind uses the shared Novelle Tech brand preset (colours, fonts, glows, keyframes). */
module.exports = {
  presets: [require('../brand/tailwind.preset.cjs')],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
