/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nm_bg: "#050816",
        nm_panel: "rgba(7,12,24,0.88)",
        nm_teal: "#4BE7CB",
        nm_pink: "#FF8AD8",
        nm_yellow: "#FFD77A",
      },
      borderRadius: {
        card: "26px",
      },
      boxShadow: {
        "nm-deep": "0 32px 90px rgba(3,7,18,0.98)",
        "nm-soft": "0 18px 50px rgba(3,7,18,0.85)",
      },
      keyframes: {
        "liquid-flow": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "50%":      { transform: "translate3d(80px, -90px, 0) scale(1.5)" },
        },
      },
      animation: {
        "liquid-slow": "liquid-flow 10s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
