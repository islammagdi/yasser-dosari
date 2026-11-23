"use client";

import { useL } from "@/lib/i18n/client";
import Link from "@/lib/i18n/nav";
import { usePathname } from "@/lib/i18n/nav";
import { useEffect, useId, useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import { lockScroll } from "@/lib/scrollLock";
import { FEEDBACK_URL, feedbackHref } from "@/lib/site";
import { useFavorites } from "@/lib/useFavorites";
import { CategoryIcon, HeartIcon } from "./icons";

/**
 * شريط التابات تحت (موبايل وتابلت، أقل من ١٢٨٠px) زي التطبيقات:
 * الرئيسية، التلاوات (لوحة بالأقسام)، مقتطفات، المصحف، المزيد (لوحة بباقي الصفحات).
 * ارتفاعه في --tabbar (globals.css)، وشريط المشغّل والمقتطفات بيترفعوا فوقه بنفس المتغيّر.
 */
type Sheet = "recitations" | "more" | null;

const MORE_PATHS = ["/surah", "/favorites", "/playlists", "/saved", "/imamate", "/about", "/transfer", "/search"];

export function MobileTabBar() {
  const { t, href } = useL();
  const pathname = usePathname();
  const [sheet, setSheet] = useState<Sheet>(null);
  const onClips = pathname === "/clips";

  // اللوحة بتتقفل لما تروح صفحة تانية
  useEffect(() => setSheet(null), [pathname]);
  useEffect(() => {
    if (!sheet) return;
    const unlock = lockScroll();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setSheet(null);
    document.addEventListener("keydown", esc);
    return () => {
      unlock();
      document.removeEventListener("keydown", esc);
    };
  }, [sheet]);

  const under = (p: string) => pathname === p || pathname.startsWith(`${p}/`);
  const onCategory = CATEGORIES.some((c) => under(`/${c.slug}`));
  const onMore = MORE_PATHS.some(under);

  const tabs: { key: string; label: string; icon: React.ReactNode; href?: string; sheet?: Sheet; active: boolean }[] = [
    { key: "home", label: "الرئيسية", icon: <HomeIcon />, href: "/", active: pathname === "/" && !sheet },
    { key: "rec", label: "التلاوات", icon: <HeadphonesIcon />, sheet: "recitations", active: sheet === "recitations" || (onCategory && !sheet) },
    { key: "clips", label: "مقتطفات", icon: <ReelIcon />, href: "/clips", active: onClips && !sheet },
    { key: "quran", label: "المصحف", icon: <BookIcon />, href: "/quran", active: under("/quran") && !sheet },
    { key: "more", label: "المزيد", icon: <MoreIcon />, sheet: "more", active: sheet === "more" || (onMore && !sheet) },
  ];

  // فوق الفيديو في المقتطفات: غامق وشفاف زي ريلز
  const barTone = onClips && !sheet ? "bg-black/55 text-white/75 backdrop-blur-md border-white/10" : "glass text-muted border-fg/10";

  return (
    <>
      {sheet && <TabSheet kind={sheet} onClose={() => setSheet(null)} />}
      <nav
        aria-label={t("التنقل الرئيسي")}
        className={`fixed inset-x-0 bottom-0 z-[48] border-t pb-[env(safe-area-inset-bottom)] xl:hidden ${barTone}`}
      >
        <ul className="mx-auto grid h-16 max-w-xl grid-cols-5">
          {tabs.map((tab) => {
            const inner = (
              <>
                <span
                  className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${
                    tab.active ? (onClips && !sheet ? "bg-white/20 text-white" : "bg-accent text-[#fff] dark:text-accent-ink") : ""
                  }`}
                >
                  {tab.icon}
                </span>
                <span className={`text-[11px] leading-4 ${tab.active ? (onClips && !sheet ? "font-semibold text-white" : "font-semibold text-text") : ""}`}>{t(tab.label)}</span>
              </>
            );
            const cls = "flex h-16 w-full flex-col items-center justify-center gap-0.5 transition-colors";
            return (
              <li key={tab.key}>
                {tab.href ? (
                  <Link href={tab.href} aria-current={tab.active ? "page" : undefined} onClick={() => setSheet(null)} className={cls}>
                    {inner}
                  </Link>
                ) : (
                  <button
                    type="button"
                    aria-expanded={sheet === tab.sheet}
                    aria-haspopup="dialog"
                    onClick={() => setSheet((s) => (s === tab.sheet ? null : tab.sheet!))}
                    className={cls}
                  >
                    {inner}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

function TabSheet({ kind, onClose }: { kind: "recitations" | "more"; onClose: () => void }) {
  const { t, toArabicDigits } = useL();
  const pathname = usePathname();
  const { ids } = useFavorites();
  const titleId = useId();
  const under = (p: string) => pathname === p || pathname.startsWith(`${p}/`);
  const row = (active: boolean) =>
    `flex min-h-14 items-center gap-3 rounded-2xl px-4 text-[17px] transition-colors ${active ? "bg-accent/10 font-semibold text-text" : "text-text hover:bg-fg/5"}`;

  return (
    <>
      {/* الخلفية: بتغطي الصفحة والمشغّل، وشريط التابات يفضل ظاهر وتقدر تدوس عليه */}
      <div aria-hidden onClick={onClose} className="fixed inset-x-0 top-0 bottom-[var(--tabbar)] z-[47] bg-black/40 xl:hidden" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed inset-x-0 bottom-[var(--tabbar)] z-[47] max-h-[70dvh] overflow-y-auto overscroll-contain rounded-t-3xl border-t border-fg/10 bg-raised px-3 pb-3 pt-2 text-text shadow-float xl:hidden"
      >
        <div aria-hidden className="mx-auto mb-2 h-1 w-10 rounded-full bg-fg/15" />
        <h2 id={titleId} className="px-4 pb-2 font-display text-xl font-bold">
          {kind === "recitations" ? t("التلاوات") : t("المزيد")}
        </h2>
        {kind === "recitations" ? (
          <ul className="mx-auto flex max-w-xl flex-col gap-1">
            {CATEGORIES.map((c) => {
              const active = under(`/${c.slug}`);
              return (
                <li key={c.slug}>
                  <Link href={`/${c.slug}`} aria-current={active ? "page" : undefined} onClick={onClose} className={row(active)}>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent dark:text-gold">
                      <CategoryIcon category={c.slug} className="h-5 w-5" />
                    </span>
                    {t(c.title)}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <ul className="mx-auto flex max-w-xl flex-col gap-1">
            <li>
              <Link href="/surah" onClick={onClose} aria-current={under("/surah") ? "page" : undefined} className={row(under("/surah"))}>
                
                {t("التلاوات بالسور")}
              </Link>
            </li>
            <li>
              <Link href="/imamate" onClick={onClose} aria-current={under("/imamate") ? "page" : undefined} className={row(under("/imamate"))}>
                
                {t("جدول الإمامة")}
              </Link>
            </li>
            <li>
              <Link href="/favorites" onClick={onClose} aria-current={under("/favorites") ? "page" : undefined} className={`${row(under("/favorites"))} justify-between`}>
                <span className="flex items-center gap-3">
                  
                  {t("المفضلة")}
                  <HeartIcon filled className="h-4 w-4 text-[#E5636B]" />
                </span>
                {ids.length > 0 && <span className="rounded-full bg-accent px-2 text-xs font-bold leading-5 text-accent-ink">{toArabicDigits(ids.length)}</span>}
              </Link>
            </li>
            <li>
              <Link href="/playlists" onClick={onClose} aria-current={under("/playlists") ? "page" : undefined} className={row(under("/playlists"))}>
                
                {t("قوائم التشغيل")}
              </Link>
            </li>
            <li>
              <Link href="/saved" onClick={onClose} aria-current={under("/saved") ? "page" : undefined} className={row(under("/saved"))}>
                
                {t("المحفوظات (بدون إنترنت)")}
              </Link>
            </li>
            <li aria-hidden className="my-1 h-px bg-fg/10" />
            <li>
              <Link href="/about" onClick={onClose} className="flex min-h-12 items-center rounded-2xl px-4 text-[15px] text-muted hover:bg-fg/5 hover:text-text">
                
                {t("عن الموقع")}
              </Link>
            </li>
            <li>
              <a
                href={feedbackHref}
                {...(FEEDBACK_URL ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="flex min-h-12 items-center rounded-2xl px-4 text-[15px] font-semibold text-gold-soft hover:bg-fg/5"
              >
                
                {t("اقترح تحسينًا")}
              </a>
            </li>
          </ul>
        )}
      </div>
    </>
  );
}

const ico = { "aria-hidden": true, viewBox: "0 0 24 24", className: "h-[22px] w-[22px]", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const HomeIcon = () => (
  <svg {...ico}>
    <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />
  </svg>
);
const HeadphonesIcon = () => (
  <svg {...ico}>
    <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
    <rect x="3.5" y="14" width="4" height="6" rx="1.5" />
    <rect x="16.5" y="14" width="4" height="6" rx="1.5" />
  </svg>
);
const ReelIcon = () => (
  <svg {...ico}>
    <rect x="5" y="3" width="14" height="18" rx="3" />
    <path d="M10.5 9.5v5l4-2.5z" fill="currentColor" />
  </svg>
);
const BookIcon = () => (
  <svg {...ico}>
    <path d="M12 6.5C10.2 5 7.6 4.5 4 4.8v13.4c3.6-.3 6.2.2 8 1.8 1.8-1.6 4.4-2.1 8-1.8V4.8c-3.6-.3-6.2.2-8 1.7z" />
    <path d="M12 6.5V20" />
  </svg>
);
const MoreIcon = () => (
  <svg {...ico}>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1.6" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6" />
  </svg>
);
