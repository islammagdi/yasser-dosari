"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import { toArabicDigits } from "@/lib/format";
import { useFavorites } from "@/lib/useFavorites";
import { FEEDBACK_URL, feedbackHref } from "@/lib/site";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { HeartIcon, SearchIcon } from "./icons";

/**
 * ديسكتوب (من ١٢٨٠px، تصميم Figma «Ind Header»): اللوجو والأقسام على اليمين، والأدوات على الشمال
 * موبايل وتابلت: اللوجو، والبحث والمفضلة وزرار القايمة. والأقسام جوه القايمة
 */
export function SiteHeader() {
  const pathname = usePathname();
  const { ids } = useFavorites();
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const onFavorites = pathname === "/favorites";
  const onQuran = pathname === "/quran" || pathname.startsWith("/quran/");
  const onClips = pathname === "/clips";
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

  // القايمة مفتوحة: الصفحة اللي ورا متتحركش، والسكرول بيبقى جوه القايمة بس
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = prev;
    };
  }, [open]);

  const iconBtn = "glass-card relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors md:h-12 md:w-12";

  // ديسكتوب (Figma: Ind Header): عناصر بارتفاع الهيدر كله (٧٢)، والنشط بخلفية accent وخط تحته
  const navItems = [
    { href: "/", label: "الرئيسية", active: pathname === "/" },
    ...CATEGORIES.map((c) => ({ href: `/${c.slug}`, label: c.label, active: isActive(c.slug) })),
    { href: "/quran", label: "قراءة", active: onQuran },
    { href: "/clips", label: "مقتطفات", active: onClips },
    { href: "/surah", label: "السور", active: onSurah },
  ];
  const deskAction = "relative flex h-[72px] shrink-0 items-center justify-center gap-1 rounded-sm px-2 text-text transition-colors hover:bg-fg/5";

  const favBadge =
    ids.length > 0 ? (
      <span className="absolute end-0 top-3 min-w-5 rounded-full bg-accent px-1.5 text-center text-[11px] font-bold leading-5 text-accent-ink xl:end-0.5 xl:top-4">
        {toArabicDigits(ids.length)}
      </span>
    ) : null;

  return (
    <header ref={headerRef} className="glass sticky top-0 z-30 border-b border-gold/25">
      {/* ---------- ديسكتوب ---------- */}
      <div className="mx-auto hidden h-[72px] max-w-page items-center justify-between gap-4 px-8 xl:flex">
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/" className="flex h-[72px] shrink-0 items-center">
            <Logo label="الشيخ ياسر الدوسري" className="h-11 w-[176px]" />
          </Link>
          <nav aria-label="الأقسام" className="flex items-center gap-1">
            {navItems.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={n.active ? "page" : undefined}
                className={`relative flex h-[72px] items-center justify-center whitespace-nowrap rounded-sm px-3 text-base leading-6 transition-colors 2xl:px-4 ${
                  // النشط: في الفاتح الأخضر الأساسي والكلمة بيضا، وفي الغامق دهبي زي التصميم
                  n.active
                    ? "bg-accent font-semibold text-[#fff] dark:text-accent-ink"
                    : "font-medium text-text hover:bg-fg/5"
                }`}
              >
                {n.label}
                {n.active && (
                  <span aria-hidden className="absolute inset-x-2 bottom-0 h-1.5 rounded-full bg-[#fff]/45 dark:bg-accent-hover" />
                )}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 items-center">
          {/* زرار اللغة: بيظهر لما النسخة الإنجليزي تنزل (NEXT_PUBLIC_ENABLE_EN=1) */}
          {process.env.NEXT_PUBLIC_ENABLE_EN === "1" && (
            <Link href="/en" lang="en" className={`${deskAction} min-w-[72px] px-4 font-medium`}>
              <TranslateIcon />
              English
            </Link>
          )}
          <Link href="/search" aria-label="البحث" aria-current={onSearch ? "page" : undefined} className={`${deskAction} ${onSearch ? "text-gold" : ""}`}>
            <SearchIcon className="h-6 w-6" />
          </Link>
          <Link
            href="/favorites"
            aria-label={`المفضلة${ids.length ? ` (${ids.length})` : ""}`}
            aria-current={onFavorites ? "page" : undefined}
            className={`${deskAction} ${onFavorites ? "text-[#E5636B]" : ""}`}
          >
            <HeartIcon filled={onFavorites} className="h-6 w-6" />
            {favBadge}
          </Link>
          <ThemeToggle className={deskAction} />
        </div>
      </div>

      {/* ---------- موبايل وتابلت ---------- */}
      <div className="mx-auto grid max-w-page grid-cols-[1fr_auto] items-center gap-x-3 px-4 py-2.5 sm:px-6 md:py-3 xl:hidden">
        <Link href="/" className="flex min-h-11 items-center justify-self-start">
          <Logo label="الشيخ ياسر الدوسري" className="w-[144px] sm:w-[176px]" />
        </Link>
        <div className="flex items-center gap-2 justify-self-end">
          <Link
            href="/search"
            aria-label="البحث"
            aria-current={onSearch ? "page" : undefined}
            className={`${iconBtn} ${onSearch ? "text-gold" : "text-muted hover:text-text"}`}
          >
            <SearchIcon className="h-5 w-5" />
          </Link>
          <ThemeToggle className={`${iconBtn} !hidden text-muted hover:text-text sm:!flex`} />
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
            className={`${iconBtn} ${open ? "text-gold" : "text-text"}`}
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* قايمة الموبايل */}
      {open && (
        <nav
          id="mobile-menu"
          aria-label="الأقسام"
          className="max-h-[calc(100dvh-4.75rem-env(safe-area-inset-top))] overflow-y-auto overscroll-contain border-t border-fg/5 xl:hidden"
        >
          {/* مسافة تحت عشان آخر عنصر ميستخباش ورا شريط المشغّل */}
          <ul className="mx-auto flex max-w-page flex-col gap-1 px-4 pb-28 pt-3">
            <li>
              <Link
                href="/"
                aria-current={pathname === "/" ? "page" : undefined}
                className={`flex min-h-12 items-center justify-between rounded-2xl px-4 text-lg transition-colors ${
                  pathname === "/" ? "bg-gold/10 font-semibold text-gold-soft" : "text-text hover:bg-fg/5"
                }`}
              >
                الرئيسية
                {pathname === "/" && <span aria-hidden className="h-2 w-2 rounded-full bg-accent" />}
              </Link>
            </li>
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
                href="/clips"
                aria-current={onClips ? "page" : undefined}
                className={`flex min-h-12 items-center justify-between rounded-2xl px-4 text-lg transition-colors ${
                  onClips ? "bg-gold/10 font-semibold text-gold-soft" : "text-text hover:bg-fg/5"
                }`}
              >
                مقتطفات
                {onClips && <span aria-hidden className="h-2 w-2 rounded-full bg-accent" />}
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
/** أيقونة الترجمة (زرار English في الهيدر) */
function TranslateIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h9M8.5 3v2M10.5 5c-.8 3.5-3 6.5-6.5 8M6.5 9c1 1.8 2.6 3.3 4.5 4.2" />
      <path d="M12.5 21l4-9 4 9M13.8 18h5.4" />
    </svg>
  );
}
