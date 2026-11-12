"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import { toArabicDigits } from "@/lib/format";
import { useFavorites } from "@/lib/useFavorites";
import { FEEDBACK_URL, feedbackHref } from "@/lib/site";
import { Logo } from "./Logo";
import { NotificationsButton } from "./NotificationsButton";
import { ThemeToggle } from "./ThemeToggle";
import { HeartIcon, SearchIcon } from "./icons";

/**
 * ديسكتوب: الأقسام على اليمين | اللوجو في النص بالظبط | البحث والمفضلة على الشمال
 * موبايل: اللوجو، والبحث والمفضلة وزرار القايمة. والأقسام جوه القايمة
 */
export function SiteHeader() {
  const pathname = usePathname();
  const { ids } = useFavorites();
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const onFavorites = pathname === "/favorites";
  const onQuran = pathname === "/quran" || pathname.startsWith("/quran/");
  const onSurah = pathname === "/surah" || pathname.startsWith("/surah/");
  const onSearch = pathname === "/search";
  const isActive = (slug: string) => pathname === `/${slug}` || pathname.startsWith(`/${slug}/`);

  // القايمة بتتقفل لما تروح صفحة تانية، أو تضغط برّه، أو تدوس Escape
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const iconBtn = "glass-card relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors md:h-12 md:w-12";

  return (
    <header ref={headerRef} className="glass sticky top-0 z-30 border-b border-gold/25">
      <div className="mx-auto grid max-w-page grid-cols-[1fr_auto] items-center gap-x-3 px-4 py-2.5 sm:px-6 md:py-3 xl:grid-cols-[1fr_auto_1fr]">
        {/* اللوجو */}
               <Link href="/" className="col-start-1 row-start-1 flex min-h-11 items-center justify-self-start">
          <Logo label="الشيخ ياسر الدوسري" className="w-[144px] sm:w-[176px]" />
        </Link>

        {/* الأقسام: ديسكتوب بس */}
        {/* القايمة الكاملة من ١٢٨٠px وطالع؛ أقل من كده (تابلت ولابتوب صغير) بتظهر في زرار القايمة */}
        <nav aria-label="الأقسام" className="hidden xl:col-start-2 xl:row-start-1 xl:block xl:justify-self-center">
          <div className="glass-card flex gap-1 rounded-full px-2 py-1">
            {CATEGORIES.map((c) => {
              const active = isActive(c.slug);
              return (
                <Link
                  key={c.slug}
                  href={`/${c.slug}`}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex min-h-11 items-center justify-center whitespace-nowrap px-4 text-[15px] transition-colors after:absolute after:inset-x-3 after:bottom-0.5 after:h-0.5 after:rounded-full lg:px-5 ${
                    active ? "font-semibold text-text after:bg-accent" : "text-muted after:bg-transparent hover:text-text"
                  }`}
                >
                  {c.label}
                </Link>
              );
            })}
            <Link
              href="/quran"
              aria-current={onQuran ? "page" : undefined}
              className={`relative flex min-h-11 items-center justify-center whitespace-nowrap px-4 text-[15px] transition-colors after:absolute after:inset-x-3 after:bottom-0.5 after:h-0.5 after:rounded-full lg:px-5 ${
                onQuran ? "font-semibold text-text after:bg-accent" : "text-muted after:bg-transparent hover:text-text"
              }`}
            >
              قراءة
            </Link>
            <Link
              href="/surah"
              aria-current={onSurah ? "page" : undefined}
              className={`relative flex min-h-11 items-center justify-center whitespace-nowrap px-4 text-[15px] transition-colors after:absolute after:inset-x-3 after:bottom-0.5 after:h-0.5 after:rounded-full lg:px-5 ${
                onSurah ? "font-semibold text-text after:bg-accent" : "text-muted after:bg-transparent hover:text-text"
              }`}
            >
              السور
            </Link>
          </div>
        </nav>

        {/* البحث والمفضلة (وزرار القايمة على الموبايل) */}
        <div className="col-start-2 row-start-1 flex items-center gap-2 justify-self-end xl:col-start-3">
          <Link
            href="/search"
            aria-label="البحث"
            aria-current={onSearch ? "page" : undefined}
            className={`${iconBtn} ${onSearch ? "text-gold" : "text-muted hover:text-text"}`}
          >
            <SearchIcon className="h-5 w-5" />
          </Link>
          <ThemeToggle className={`${iconBtn} !hidden text-muted hover:text-text sm:!flex`} />
          <NotificationsButton className={`${iconBtn} text-muted hover:text-text`} />
          <Link
            href="/favorites"
            aria-label={`المفضلة${ids.length ? ` (${ids.length})` : ""}`}
            aria-current={onFavorites ? "page" : undefined}
            className={`${iconBtn} ${onFavorites ? "text-[#E5636B]" : "text-muted hover:text-text"}`}
          >
            <HeartIcon filled={onFavorites} className="h-5 w-5" />
            {ids.length > 0 && (
              <span className="absolute -top-1 end-0 min-w-5 rounded-full bg-accent px-1.5 text-center text-[11px] font-bold leading-5 text-accent-ink">
                {toArabicDigits(ids.length)}
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "إغلاق القائمة" : "القائمة"}
            className={`${iconBtn} xl:hidden ${open ? "text-gold" : "text-text"}`}
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* قايمة الموبايل */}
      {open && (
        <nav id="mobile-menu" aria-label="الأقسام" className="border-t border-fg/5 xl:hidden">
          <ul className="mx-auto flex max-w-page flex-col gap-1 px-4 py-3">
            {CATEGORIES.map((c) => {
              const active = isActive(c.slug);
              return (
                <li key={c.slug}>
                  <Link
                    href={`/${c.slug}`}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-12 items-center justify-between rounded-2xl px-4 text-lg transition-colors ${
                      active ? "bg-gold/10 font-semibold text-gold-soft" : "text-text hover:bg-fg/5"
                    }`}
                  >
                    {c.title}
                    {active && <span aria-hidden className="h-2 w-2 rounded-full bg-accent" />}
                  </Link>
                </li>
              );
            })}
            <li>
              <Link
                href="/quran"
                aria-current={onQuran ? "page" : undefined}
                className={`flex min-h-12 items-center justify-between rounded-2xl px-4 text-lg transition-colors ${
                  onQuran ? "bg-gold/10 font-semibold text-gold-soft" : "text-text hover:bg-fg/5"
                }`}
              >
                قراءة القرآن
                {onQuran && <span aria-hidden className="h-2 w-2 rounded-full bg-accent" />}
              </Link>
            </li>
            <li>
              <Link
                href="/surah"
                aria-current={onSurah ? "page" : undefined}
                className={`flex min-h-12 items-center justify-between rounded-2xl px-4 text-lg transition-colors ${
                  onSurah ? "bg-gold/10 font-semibold text-gold-soft" : "text-text hover:bg-fg/5"
                }`}
              >
                التلاوات بالسور
                {onSurah && <span aria-hidden className="h-2 w-2 rounded-full bg-accent" />}
              </Link>
            </li>
            <li>
              <Link href="/playlists" className="flex min-h-12 items-center rounded-2xl px-4 text-lg text-text transition-colors hover:bg-fg/5">
                قوائم التشغيل
              </Link>
            </li>
            <li>
              <Link href="/saved" className="flex min-h-12 items-center rounded-2xl px-4 text-lg text-text transition-colors hover:bg-fg/5">
                المحفوظات (بدون إنترنت)
              </Link>
            </li>
            <li aria-hidden className="my-2 h-px bg-fg/10" />
            <li className="sm:hidden">
              <ThemeToggle withLabel className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-4 text-[15px] text-muted transition-colors hover:bg-fg/5 hover:text-text" />
            </li>
            <li>
              <Link href="/about" className="flex min-h-11 items-center rounded-2xl px-4 text-[15px] text-muted transition-colors hover:bg-fg/5 hover:text-text">
                عن الموقع
              </Link>
            </li>
            <li>
              <a
                href={feedbackHref}
                {...(FEEDBACK_URL ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="flex min-h-11 items-center rounded-2xl px-4 text-[15px] font-semibold text-gold-soft transition-colors hover:bg-fg/5"
              >
                اقترح تحسينًا
              </a>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}