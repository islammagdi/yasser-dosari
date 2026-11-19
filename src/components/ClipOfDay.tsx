"use client";

import Link from "next/link";
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

/** «مقتطف اليوم» في الرئيسية: مقطع مختلف كل يوم، والضغط عليه بيفتح المقتطفات عنده */
export function ClipOfDay({ clips }: { clips: ClipCard[] }) {
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(makkahToday(new Date())), []);
  if (!clips.length) return null;
  const c = clips[today ? dayIndex(today, clips.length) : 0];

  return (
    <section aria-labelledby="clip-of-day-title">
      <Link
        href={`/clips?c=${c.id}`}
        className="group relative isolate flex items-center gap-5 overflow-hidden rounded-[28px] bg-gradient-to-l from-[#1E4A3C] to-[#10241D] p-4 text-[#F1EEE6] sm:p-5"
      >
        <span aria-hidden className="pattern-stars absolute inset-0 -z-10 opacity-[0.12]" />
        <span className="relative aspect-[9/16] w-24 shrink-0 overflow-hidden rounded-2xl bg-black/30 sm:w-28">
          {c.poster && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.poster} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          )}
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 backdrop-blur">
              <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
              </svg>
            </span>
          </span>
        </span>
        <span className="flex min-w-0 flex-col gap-1.5">
          <span id="clip-of-day-title" className="text-sm font-semibold text-[#E7CD94]">
            مقتطف اليوم
          </span>
          <span className="line-clamp-2 font-display text-2xl font-bold leading-snug sm:text-3xl">{c.title}</span>
          <span className="text-sm text-[#A9B7AF]">اضغط واتفرّج، وقلّب على باقي المقتطفات</span>
        </span>
      </Link>
    </section>
  );
}
