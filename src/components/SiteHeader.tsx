"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CATEGORIES } from "@/lib/categories";
import { toArabicDigits } from "@/lib/format";
import { useFavorites } from "@/lib/useFavorites";
import { HeartIcon } from "./icons";

export function SiteHeader() {
  const pathname = usePathname();
  const { ids } = useFavorites();
  const onFavorites = pathname === "/favorites";
  return (
    <header className="glass sticky top-0 z-30 border-b border-white/5">
      <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex min-h-11 items-center">
          <Image
            src="/images/logo.png"
            alt="الشيخ ياسر الدوسري"
            width={0}
            height={0}
            sizes="200px"
            priority
            className="h-10 w-auto sm:h-11"
          />
        </Link>
        <div className="flex items-center gap-2">
          <nav aria-label="الأقسام" className="glass-card flex gap-1 rounded-full p-1">
            {CATEGORIES.map((c) => {
              const active = pathname === `/${c.slug}`;
              return (
                <Link
                  key={c.slug}
                  href={`/${c.slug}`}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 items-center rounded-full px-5 text-[15px] transition-colors ${
                    active ? "bg-gold font-semibold text-gold-ink" : "text-muted hover:bg-white/5 hover:text-text"
                  }`}
                >
                  {c.label}
                </Link>
              );
            })}
          </nav>
          <Link
            href="/favorites"
            aria-label={`المفضلة${ids.length ? ` (${ids.length})` : ""}`}
            aria-current={onFavorites ? "page" : undefined}
            className={`glass-card relative flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full transition-colors ${
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