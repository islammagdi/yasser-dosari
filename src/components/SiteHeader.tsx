"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CATEGORIES } from "@/lib/categories";
import { toArabicDigits } from "@/lib/format";
import { useFavorites } from "@/lib/useFavorites";
import { HeartIcon, SearchIcon } from "./icons";

export function SiteHeader() {
  const pathname = usePathname();
  const { ids } = useFavorites();
  const onFavorites = pathname === "/favorites";

  return (
    <header className="glass sticky top-0 z-30 border-b border-white/5">
      {/* موبايل: اللوجو والمفضلة في صف، والأقسام بعرض الشاشة تحتهم. من md: كله في صف واحد */}
      <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2.5 sm:px-6 md:py-3">
        <Link href="/" className="order-1 flex min-h-11 items-center">
          <Image
            src="/images/logo.png"
            alt="الشيخ ياسر الدوسري"
            width={0}
            height={0}
            sizes="200px"
            priority
            className="h-9 w-auto sm:h-11"
          />
        </Link>

        <nav aria-label="الأقسام" className="order-3 w-full overflow-x-auto md:order-2 md:w-auto">
          <div className="glass-card flex min-w-full gap-1 rounded-full p-1 md:min-w-0">
            {CATEGORIES.map((c) => {
              const active = pathname === `/${c.slug}`;
              return (
                <Link
                  key={c.slug}
                  href={`/${c.slug}`}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 flex-1 items-center justify-center whitespace-nowrap rounded-full px-3 text-[15px] transition-colors md:flex-none md:px-5 ${
                    active ? "bg-gold font-semibold text-gold-ink" : "text-muted hover:bg-white/5 hover:text-text"
                  }`}
                >
                  {c.label}
                </Link>
              );
            })}
          </div>
        </nav>
        <div className="col-start-2 row-start-1 flex items-center gap-2 justify-self-end md:col-start-3">
          <Link
            href="/search"
            aria-label="البحث"
            aria-current={pathname === "/search" ? "page" : undefined}
            className={`glass-card flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors md:h-[52px] md:w-[52px] ${
              pathname === "/search" ? "text-gold" : "text-muted hover:text-text"
            }`}
          >
            <SearchIcon className="h-5 w-5" />
          </Link>
          <Link
            href="/favorites"
            aria-label={`المفضلة${ids.length ? ` (${ids.length})` : ""}`}
            aria-current={onFavorites ? "page" : undefined}
            className={`glass-card relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors md:h-[52px] md:w-[52px] ${
              onFavorites ? "text-[#E5636B]" : "text-muted hover:text-text"
            }`}
          >
            <HeartIcon filled={onFavorites} className="h-5 w-5" />
            {ids.length > 0 && (
              <span className="absolute -top-1 end-0 min-w-5 rounded-full bg-gold px-1.5 text-center text-[11px] font-bold leading-5 text-gold-ink">
                {toArabicDigits(ids.length)}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}