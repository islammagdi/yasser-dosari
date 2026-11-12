"use client";

import Link from "next/link";
import type { HomeCollection } from "@/lib/homeCollections";
import { formatDuration, recitationsLabel, toArabicDigits } from "@/lib/format";
import { isPlayable } from "@/lib/labels";
import { usePlayer } from "./PlayerProvider";
import { PauseIcon, PlayIcon } from "./icons";

/** ألوان ثابتة في الوضعين: الكروت غامقة والكلام فاتح عليها */
const TONES: Record<HomeCollection["tone"], string> = {
  emerald: "from-[#1E4A3C] to-[#0F2A21]",
  amber: "from-[#6B4A1A] to-[#3A2810]",
  navy: "from-[#24384A] to-[#121D28]",
  maroon: "from-[#4A1E2C] to-[#26101A]",
};

function totalLabel(items: HomeCollection["items"]) {
  const sec = items.reduce((a, r) => a + (r.durationSec ?? 0), 0);
  const count = recitationsLabel(items.length);
  if (!sec) return count;
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  const time = h ? `${toArabicDigits(h)} ساعة${m ? ` و${toArabicDigits(m)} دقيقة` : ""}` : formatDuration(sec);
  return `${count}، ${time}`;
}

/** مجموعات للاستماع: قوايم أوتوماتيك بتتشغّل كلها مرة واحدة */
export function HomeCollections({ collections }: { collections: HomeCollection[] }) {
  const p = usePlayer();
  if (!collections.length) return null;

  return (
    <section aria-labelledby="collections-title" className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 id="collections-title" className="font-display text-3xl font-bold sm:text-4xl">
          مجموعات للاستماع
        </h2>
        <p className="text-muted">قوايم جاهزة بتتحدّث لوحدها كل ما تتضاف تلاوة جديدة.</p>
      </div>

      <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
        {collections.map((c) => {
          const playable = c.items.filter(isPlayable);
          const inThis = !!p.current && c.items.some((r) => r.id === p.current!.id);
          const playingNow = inThis && p.isPlaying;
          return (
            <li
              key={c.id}
              className={`relative isolate flex h-[300px] w-[78%] shrink-0 snap-start flex-col justify-end overflow-hidden rounded-[28px] bg-gradient-to-b p-6 text-[#F1EEE6] sm:h-[320px] sm:w-auto ${TONES[c.tone]}`}
            >
              <span aria-hidden className="pattern-stars absolute inset-0 -z-10 opacity-[0.16]" />
              <span aria-hidden className="absolute inset-x-6 top-6 font-ruqaa text-5xl font-bold leading-[1.15] lg:text-[3.4rem]">
                {c.word}
              </span>
              <div className="flex items-end gap-3">
                <div className="flex min-w-0 flex-1 flex-col">
                  {c.href ? (
                    <Link href={c.href} className="font-display text-2xl font-bold leading-snug after:absolute after:inset-0 hover:text-[#E7CD94]">
                      <span className="sr-only">{c.word}: </span>
                      {c.title}
                    </Link>
                  ) : (
                    <p className="font-display text-2xl font-bold leading-snug">
                      <span className="sr-only">{c.word}: </span>
                      {c.title}
                    </p>
                  )}
                  <span className="text-[13px] text-[#F1EEE6]/75">{totalLabel(c.items)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => (inThis ? p.toggle() : p.playQueue(playable, 0))}
                  disabled={!playable.length}
                  aria-label={`${playingNow ? "إيقاف" : "تشغيل"} ${c.word}`}
                  className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur transition-colors hover:bg-white/25 disabled:opacity-40"
                >
                  {playingNow ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
