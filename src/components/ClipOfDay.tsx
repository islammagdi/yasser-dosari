"use client";

import { useL } from "@/lib/i18n/client";
import Link from "@/lib/i18n/nav";
import { useEffect, useState } from "react";
import { makkahToday } from "@/lib/imamate";

export interface ClipCard {
  id: string;
  title: string;
  poster?: string;
}

/** رقم ثابت من التاريخ: نفس المقطع لكل الناس طول اليوم (بتوقيت مكة) */
function dayIndex(date: string, n: number) {
  let h = 0;
  for (const ch of date) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % n;
}

/**
 * المقتطفات في الرئيسية: صف كروت طولية بتتسحب بالعرض (مش كارت واحد واخد السطر كله).
 * أول كارت «مقتطف اليوم» (بيتغيّر كل يوم بتاريخ مكة)، وبعده الأحدث.
 */
export function ClipOfDay({ clips }: { clips: ClipCard[] }) {
  const { t } = useL();
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(makkahToday(new Date())), []);
  if (!clips.length) return null;
  const pick = clips[today ? dayIndex(today, clips.length) : 0];
  const ordered = [pick, ...clips.filter((c) => c.id !== pick.id)].slice(0, 12);

  return (
    <section aria-labelledby="home-clips-title" className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <h2 id="home-clips-title" className="font-display text-3xl font-bold sm:text-4xl">
          
          {t("مقتطفات")}
        </h2>
        <Link
          href="/clips"
          className="flex min-h-11 items-center rounded-full border border-line-strong px-5 text-sm font-semibold transition-colors hover:border-gold/60 hover:text-gold-soft"
        >
          
          {t("كل المقتطفات")}
        </Link>
      </div>
      <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        {ordered.map((c, i) => (
          <li key={c.id} className="w-32 shrink-0 snap-start sm:w-40">
            <Link href={`/clips?c=${c.id}`} className="group flex flex-col gap-2">
              <span className="relative block aspect-[9/16] overflow-hidden rounded-2xl bg-deep">
                {c.poster && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.poster} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                )}
                <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                {i === 0 && (
                  <span className="absolute start-2 top-2 rounded-full bg-[#CDAA62] px-2 py-0.5 text-[11px] font-bold text-[#1A1408]">{t("مقتطف اليوم")}</span>
                )}
                <span className="absolute bottom-2 start-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur">
                  <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                    <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
                  </svg>
                </span>
              </span>
              <span className="line-clamp-2 text-sm font-medium leading-6 group-hover:text-gold-soft">{c.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
