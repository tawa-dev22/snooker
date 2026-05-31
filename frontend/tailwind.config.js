/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        snooker: {
          felt: '#047857',      // Emerald 700 - Classic snooker table green
          emerald: '#10b981',   // Emerald 500
          lightEmerald: '#34d399', // Emerald 400
          slateBg: '#020617',    // Slate 950 - Deep dark canvas
          cardBg: '#0f172a',     // Slate 900 - Sleek card base
          accentGold: '#f59e0b', // Amber 500 - Brass cues and markers
          chalkBlue: '#0284c7'   // Sky 600 - Cue chalk blue
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-fast': 'pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-spin': 'spin 3s linear infinite',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
