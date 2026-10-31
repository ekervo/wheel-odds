/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0c0a08',
        panel: '#15110d',
        panel2: '#1d1710',
        line: 'rgba(255,196,120,0.11)',
        ink: '#fff3dc',
        mute: '#b5a68f',
        faint: '#7f7261',
        gold: '#ffb43a',
        cyan: '#6c88ff',
        up: '#6fdc8c',
        down: '#ff6b6b',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
