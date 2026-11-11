/** Novelle Tech Tailwind preset. Use in tailwind.config.js: presets: [require('../brand/tailwind.preset.cjs')] */
module.exports = {
  theme: {
    extend: {
      colors: {
        ink: { 950: '#07040A', 900: '#0E0910', 800: '#171018', 700: '#241A24' },
        rose: {
          50: '#FFF0F6', 200: '#FCD3E6', 300: '#F5A8CC', 400: '#E88FBF',
          500: '#D884A8', 700: '#902F54', 800: '#601830', 900: '#3A0C1F',
        },
        spark: { 400: '#F5C451' },
        success: '#5ED3A0',
        warning: '#F5C451',
        danger: '#FF6B8A',
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        accent: ['"Playfair Display"', 'serif'],
        body: ['Montserrat', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        metal: 'linear-gradient(180deg,#FCD3E6 0%,#E88FBF 45%,#B55A86 70%,#F5A8CC 100%)',
        satin: 'linear-gradient(120deg,#3A0C1F 0%,#902F54 35%,#D884A8 60%,#902F54 100%)',
        glow: 'radial-gradient(circle at 50% 50%,rgba(232,143,191,.35),transparent 65%)',
      },
      boxShadow: {
        glow: '0 0 24px rgba(232,143,191,.35), 0 0 64px rgba(232,143,191,.15)',
        'glow-sm': '0 0 12px rgba(232,143,191,.35)',
      },
      letterSpacing: { brand: '0.6em', label: '0.2em' },
      transitionTimingFunction: { brand: 'cubic-bezier(0.22,1,0.36,1)' },
      keyframes: {
        shine: { '0%': { transform: 'translateX(-120%) skewX(-20deg)' }, '100%': { transform: 'translateX(220%) skewX(-20deg)' } },
        twinkle: { '0%,100%': { opacity: 0, transform: 'scale(.4)' }, '50%': { opacity: 1, transform: 'scale(1)' } },
        marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      animation: {
        shine: 'shine 1.2s cubic-bezier(0.22,1,0.36,1)',
        twinkle: 'twinkle 2.4s ease-in-out infinite',
        marquee: 'marquee 30s linear infinite',
        shimmer: 'shimmer 1.6s linear infinite',
      },
    },
  },
};
