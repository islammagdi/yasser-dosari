"use client";

import { useEffect, useState } from "react";

export const THEME_KEY = "yd-theme";
const THEME_COLORS = { light: "#F4EEE1", dark: "#0D1512" } as const;
type Theme = keyof typeof THEME_COLORS;

/**
 * سكريبت صغير بيشتغل قبل ما الصفحة تترسم، عشان اللي اختار الغامق ميشوفش وميض فاتح.
 * بيتحط في <head> من layout.tsx.
 */
export const themeInitScript = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="dark"){document.documentElement.dataset.theme="dark";var m=document.querySelector('meta[name="theme-color"]');if(m)m.content="${THEME_COLORS.dark}"}}catch(e){}`;

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") root.dataset.theme = "dark";
  else delete root.dataset.theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[theme]);
}

/** withLabel: نسخة القايمة على الموبايل، أيقونة ونص */
export function ThemeToggle({ className = "", withLabel = false }: { className?: string; withLabel?: boolean }) {
  const [theme, setTheme] = useState<Theme | null>(null);
  useEffect(() => setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light"), []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    apply(next);
    setTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* التخزين مقفول: الاختيار هيفضل للزيارة دي بس */
    }
  };

  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={withLabel ? undefined : dark ? "الوضع الفاتح" : "الوضع الغامق"}
      title={withLabel ? undefined : dark ? "الوضع الفاتح" : "الوضع الغامق"}
      className={className}
    >
      <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {dark ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
          </>
        ) : (
          <path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z" />
        )}
      </svg>
      {withLabel && <span>{dark ? "الوضع الفاتح" : "الوضع الغامق"}</span>}
    </button>
  );
}
