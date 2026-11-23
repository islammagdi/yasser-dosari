"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { switchHref } from "@/lib/i18n/config";
import { useLang } from "@/lib/i18n/client";

const LANG_KEY = "yd-lang";

/**
 * تبديل اللغة لنفس الصفحة. رابط عادي (مش Link) عشان الصفحة تتحمّل من جديد باتجاه ولغة صح.
 * الاختيار بيتحفظ عشان الـ PWA تفتح بنفس اللغة.
 */
function Inner({ className, children }: { className?: string; children?: React.ReactNode }) {
  const lang = useLang();
  const pathname = usePathname() ?? "/";
  const search = useSearchParams()?.toString() ?? "";
  const to = lang === "ar" ? "en" : "ar";
  return (
    <a
      href={switchHref(pathname, search, to)}
      hrefLang={to}
      lang={to}
      onClick={() => {
        try {
          localStorage.setItem(LANG_KEY, to);
        } catch {
          /* تجاهل */
        }
      }}
      className={className}
    >
      {children}
      {to === "en" ? "English" : "العربية"}
    </a>
  );
}

export function LangSwitch(props: { className?: string; children?: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <Inner {...props} />
    </Suspense>
  );
}

export function TranslateIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h9M8.5 3v2M10.5 5c-.8 3.5-3 6.5-6.5 8M6.5 9c1 1.8 2.6 3.3 4.5 4.2" />
      <path d="M12.5 21l4-9 4 9M13.8 18h5.4" />
    </svg>
  );
}
