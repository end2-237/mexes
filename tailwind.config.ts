import type { Config } from "tailwindcss";

// Palette reprise du dashboard.html original (thème blanc & bleu Clé Minutes)
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "cm-blue": {
          vif: "#1D4ED8",
          med: "#3B82F6",
          clair: "#EFF6FF",
          bord: "#BFDBFE",
        },
        "cm-gris": {
          fond: "#F1F5F9",
          txt: "#64748B",
          dark: "#1E293B",
        },
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
