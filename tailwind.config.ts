import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0D1512",
        night: "#111C18",
        surface: "#15211C",
        raised: "#1B2A24",
        line: "#22322B",
        "line-strong": "#2E4038",
        emerald: "#1E4A3C",
        text: "#F1EEE6",
        muted: "#A3B1A9",
        gold: { DEFAULT: "#CDAA62", soft: "#E7CD94", ink: "#1A1408" },
      },
      fontFamily: {
        display: ["var(--font-amiri)", "serif"],
        quran: ["var(--font-amiri-quran)", "var(--font-amiri)", "serif"],
        ruqaa: ["var(--font-ruqaa)", "var(--font-amiri)", "serif"],
        sans: ["var(--font-plex)", "Tahoma", "system-ui", "sans-serif"],
      },
        maxWidth: { page: "1400px" },
      boxShadow: {
        glow: "0 10px 30px -10px rgb(205 170 98 / 0.55)",
        float: "0 24px 60px -16px rgb(0 0 0 / 0.7)",
      },
    },
  },
  plugins: [],
};

export default config;