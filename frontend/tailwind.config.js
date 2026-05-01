/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#06030d',
        panel: '#0d0817',
        panel2: '#140d23',
        border: '#241936',
        accent: '#a855f7',     // electric violet
        accent2: '#7c3aed',    // deep violet
        accent3: '#c084fc',    // light violet (highlights)
        muted: '#8a7da3',
      },
      boxShadow: {
        glow: '0 0 80px -10px rgba(168,85,247,0.45)',
        'glow-sm': '0 0 30px -5px rgba(168,85,247,0.4)',
        'glow-strong': '0 0 100px -10px rgba(168,85,247,0.6), 0 0 40px -5px rgba(192,132,252,0.4)',
      },
      backgroundImage: {
        'halftone': 'radial-gradient(circle, rgba(168,85,247,0.18) 1.2px, transparent 1.5px)',
        'gradient-violet': 'linear-gradient(135deg, #a855f7 0%, #7c3aed 50%, #6d28d9 100%)',
      },
      keyframes: {
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 30px -5px rgba(168,85,247,0.4)' },
          '50%':       { boxShadow: '0 0 60px -5px rgba(168,85,247,0.7)' },
        },
      },
      animation: {
        glowPulse: 'glowPulse 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
