import type { Config } from "tailwindcss";

/** كل لون جاي من متغير CSS في globals.css، عشان نفس الكلاسات تشتغل في الوضع الفاتح والغامق */
const v = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  // dark: بيشتغل لما <html data-theme="dark">، مش من إعدادات الجهاز
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        ink: v("ink"),
        night: v("night"),
        surface: v("surface"),
        raised: v("raised"),
        line: v("line"),
        "line-strong": v("line-strong"),
        emerald: v("emerald"),
        deep: v("deep"),
        text: v("text"),
        muted: v("muted"),
        /** لون النص الأساسي كشفافية: بديل white/x اللي كان مفترض إن الخلفية غامقة */
        fg: v("fg"),
        gold: { DEFAULT: v("gold"), soft: v("gold-soft"), ink: v("gold-ink") },
        /** لون الزراير الأساسية: أخضر في الفاتح، دهبي في الغامق */
        accent: { DEFAULT: v("accent"), hover: v("accent-hover"), ink: v("accent-ink") },
      },
      fontFamily: {
        // المتغيرات دي جاية من next/font في layout.tsx؛ من غيرها الاسم "Amiri" مش بيطابق الخط المتحمّل
        display: ["var(--font-amiri)", "Amiri", "serif"],
        quran: ["var(--font-amiri-quran)", '"Amiri Quran"', "var(--font-amiri)", "serif"],
        ruqaa: ["var(--font-ruqaa)", '"Aref Ruqaa"', "var(--font-amiri)", "serif"],
        sans: ["var(--font-plex)", '"IBM Plex Sans Arabic"', "Tahoma", "system-ui", "sans-serif"],
      },
      maxWidth: { page: "1400px" },
      boxShadow: {
        glow: "0 10px 30px -10px rgb(var(--c-gold) / 0.55)",
        float: "var(--shadow-float)",
        soft: "var(--shadow-soft)",
      },
    },
  },
  plugins: [],
};

export default config;
