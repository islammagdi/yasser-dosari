"use client";

import { useEffect, useRef, useState } from "react";
import { useL } from "@/lib/i18n/client";
import Link from "@/lib/i18n/nav";
import { usePathname } from "@/lib/i18n/nav";
import { CATEGORIES } from "@/lib/categories";
import { useFavorites } from "@/lib/useFavorites";
import { useSeason } from "@/lib/useSeason";
import { hijriOf } from "@/lib/imamate";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { LangSwitch, TranslateIcon } from "./LangSwitch";
import { CategoryIcon, HeartIcon, SearchIcon } from "./icons";

/**
 * الهيدر الجديد (الريديزاين):
 * - ديسكتوب (من ١٢٨٠px): شريط عايم في النص، شفاف فوق blur، على قد محتواه.
 *   «التلاوات» بتفتح قايمة صغيرة بالأقسام الخمسة (نفس لوحة التابات في الموبايل).
 * - موبايل وتابلت: اللوجو والبحث واللغة والوضع. التنقل كله في MobileTabBar.
 * - في رمضان: شارة «رمضان ١٤٤٨»، والروابط بتبقى: الليالي، مقاطع رمضان، ختمتي، جدول التراويح، وباقي الأقسام.
 *   وزرار الفاتح/الغامق بيختفي (الموقع ليلي طول الشهر).
 */
export function SiteHeader() {
  const { t, toArabicDigits } = useL();
  const pathname = usePathname();
  const { ids } = useFavorites();
  const season = useSeason();
  const ramadan = season === "ramadan";

  const under = (p: string) => pathname === p || pathname.startsWith(`${p}/`);
  const onCategory = CATEGORIES.some((c) => under(`/${c.slug}`));
  const onSearch = pathname === "/search";
  const onFavorites = pathname === "/favorites";

  // النسخة العادية: الرئيسية، والتلاوات (قايمة بالأقسام)، وباقي الصفحات
  const links = [
    { href: "/clips", label: "مقتطفات", active: pathname === "/clips" },
    { href: "/quran", label: "المصحف", active: under("/quran") },
    { href: "/surah", label: "السور", active: under("/surah") },
    { href: "/imamate", label: "جدول الإمامة", active: under("/imamate") },
  ];
  // رمضان: الانتباه كله للتراويح والمقاطع، وباقي الموقع في قايمة «باقي الأقسام»
  const ramadanLinks = [
    { href: "/", label: "الليالي", active: pathname === "/" },
    { href: "/clips", label: "مقاطع رمضان", active: pathname === "/clips" },
    { href: "/#khatma", label: "ختمتي", active: false },
    { href: "/imamate", label: "جدول التراويح", active: under("/imamate") },
  ];
  const categoryItems = CATEGORIES.map((c) => ({ href: `/${c.slug}`, label: c.title, icon: <CategoryIcon category={c.slug} className="h-4 w-4" /> }));
  const restItems = [
    ...categoryItems,
    { href: "/quran", label: "المصحف", icon: null },
    { href: "/surah", label: "السور", icon: null },
  ];

  const pill = (active: boolean) =>
    `flex h-10 items-center whitespace-nowrap rounded-full px-4 button-sm transition-colors duration-300 ease-out focus-visible:outline-offset-0 ${
      active ? "bg-accent text-accent-ink" : "font-medium text-text hover:bg-fg/5"
    }`;
  const tool =
    "relative flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full border border-line bg-raised px-2.5 text-text transition-colors duration-300 ease-out hover:border-line-strong active:scale-[0.98]";

  const favBadge =
    ids.length > 0 ? (
      <span className="absolute -end-1 -top-1 min-w-5 rounded-full bg-accent px-1.5 text-center caption-3 leading-5 text-accent-ink">
        {toArabicDigits(ids.length)}
      </span>
    ) : null;

  const year = ramadan ? hijriOf(new Date(Date.now() + 9 * 3_600_000)).y : null;
  const ramadanBadge = year ? (
    <span className="rounded-full bg-gold/15 px-2.5 py-1 caption-3 text-gold-soft">
      {t("رمضان")} {toArabicDigits(year)}
    </span>
  ) : null;

  return (
    <header className="pointer-events-none sticky top-0 z-30 px-3 pt-3 xl:px-6 xl:pt-4">
      {/* ---------- ديسكتوب: شريط عايم ---------- */}
      <div className="pointer-events-auto mx-auto hidden w-fit max-w-full items-center gap-4 rounded-full border border-line bg-raised/80 py-2 pe-2 ps-5 shadow-float backdrop-blur-xl xl:flex">
        <Link href="/" className="flex shrink-0 items-center">
          <Logo label={t("الشيخ ياسر الدوسري")} className="h-9 w-[144px]" />
        </Link>
        {ramadanBadge}
        <nav aria-label={t("الأقسام")} className="flex items-center gap-1">
          {ramadan ? (
            <>
              {ramadanLinks.map((n) => (
                <Link key={n.href} href={n.href} aria-current={n.active ? "page" : undefined} className={pill(n.active)}>
                  {t(n.label)}
                </Link>
              ))}
              <NavMenu label="باقي الأقسام" items={restItems} active={onCategory || under("/quran") || under("/surah")} pill={pill} />
            </>
          ) : (
            <>
              <Link href="/" aria-current={pathname === "/" ? "page" : undefined} className={pill(pathname === "/")}>
                {t("الرئيسية")}
              </Link>
              <NavMenu label="التلاوات" items={categoryItems} active={onCategory} pill={pill} />
              {links.map((n) => (
                <Link key={n.href} href={n.href} aria-current={n.active ? "page" : undefined} className={pill(n.active)}>
                  {t(n.label)}
                </Link>
              ))}
            </>
          )}
        </nav>
        <div className="flex shrink-0 items-center gap-1.5">
          <Link href="/search" aria-label={t("البحث")} aria-current={onSearch ? "page" : undefined} className={`${tool} ${onSearch ? "text-gold" : ""}`}>
            <SearchIcon className="h-5 w-5" />
          </Link>
          <Link
            href="/favorites"
            aria-label={`${t("المفضلة")}${ids.length ? ` (${toArabicDigits(ids.length)})` : ""}`}
            aria-current={onFavorites ? "page" : undefined}
            className={`${tool} ${onFavorites ? "text-[#E5636B]" : ""}`}
          >
            <HeartIcon filled={onFavorites} className="h-5 w-5" />
            {favBadge}
          </Link>
          <LangSwitch className={`${tool} gap-1 px-3 caption-3`}>
            <TranslateIcon className="h-5 w-5" />
          </LangSwitch>
          {!ramadan && <ThemeToggle className={tool} />}
        </div>
      </div>

      {/* ---------- موبايل وتابلت ---------- */}
      <div className="pointer-events-auto mx-auto flex max-w-page items-center justify-between gap-3 rounded-full border border-line bg-raised/80 py-1.5 pe-1.5 ps-4 shadow-soft backdrop-blur-xl xl:hidden">
        <Link href="/" className="flex min-h-11 shrink-0 items-center gap-2">
          <Logo label={t("الشيخ ياسر الدوسري")} className="w-[128px] sm:w-[160px]" />
        </Link>
        <div className="flex items-center gap-1.5">
          {ramadanBadge}
          <Link
            href="/search"
            aria-label={t("البحث")}
            aria-current={onSearch ? "page" : undefined}
            className={`${tool} h-11 min-w-11 ${onSearch ? "text-gold" : ""}`}
          >
            <SearchIcon className="h-5 w-5" />
          </Link>
          <LangSwitch className={`${tool} h-11 min-w-11 px-3 caption-3`} />
          {!ramadan && <ThemeToggle className={`${tool} h-11 min-w-11`} />}
        </div>
      </div>
    </header>
  );
}

type MenuItem = { href: string; label: string; icon: React.ReactNode };

/** قايمة صغيرة في الديسكتوب («التلاوات»، أو «باقي الأقسام» في رمضان): بتتقفل بـ Escape أو بالضغط برّاها أو لما الصفحة تتغير */
function NavMenu({ label, items, active, pill }: { label: string; items: MenuItem[]; active: boolean; pill: (active: boolean) => string }) {
  const { t } = useL();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button type="button" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((o) => !o)} className={`${pill(active)} gap-1.5`}>
        {t(label)}
        <svg aria-hidden viewBox="0 0 24 24" className={`h-4 w-4 transition-transform duration-300 ease-out ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul className="absolute start-0 top-[calc(100%+12px)] w-64 rounded-3xl border border-line bg-raised p-2 shadow-float">
          {items.map((it) => {
            const here = pathname === it.href || pathname.startsWith(`${it.href}/`);
            return (
              <li key={it.href}>
                <Link
                  href={it.href}
                  aria-current={here ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-3 rounded-2xl px-3 body-5 transition-colors duration-300 ease-out ${here ? "bg-accent/10 text-text" : "text-text hover:bg-fg/5"}`}
                >
                  {it.icon && <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">{it.icon}</span>}
                  {t(it.label)}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
