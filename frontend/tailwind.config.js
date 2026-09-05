/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: { colors: {
    rr: { bg:'#151517', surface:'#1d1d21', elevated:'#24242a', blue:'#45B5E7', magenta:'#B24D9C', ink:'#FFFFFF', muted:'#9fa3ad' }
  }, boxShadow: { glow: '0 0 28px rgba(69,181,231,.16)' } } },
  plugins: [],
};
