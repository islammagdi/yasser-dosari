"use client";

import Image from "next/image";
import { useState } from "react";
import type { Recording } from "@/types";
import { getCategory } from "@/lib/categories";
import { usePlayer } from "./PlayerProvider";
import { RecordingCover } from "./RecordingCover";
import { periodLabel } from "./RecordingRow";
import { PauseIcon, PlayIcon } from "./icons";

/** الصورة اللي بتظهر في البانر لو التسجيل ملوش صورة خاصة */
const DEFAULT_BANNER_IMAGE = "/images/sheikh.jpg";

export function RecentBanner({ items }: { items: Recording[] }) {
  const { current, isPlaying, playQueue } = usePlayer();
  const [index, setIndex] = useState(0);
  const featured = items[index] ?? items[0];
  if (!featured) return null;

  const others = items.map((r, i) => ({ r, i })).filter((x) => x.i !== index).slice(0, 3);
  const featuredPlaying = current?.id === featured.id && isPlaying;
  const meta = [getCategory(featured.category)?.title, periodLabel(featured), featured.subtitle].filter(Boolean);

  return (
    <section
      aria-labelledby="h-recent"
      className="grid overflow-hidden rounded-[2rem] border border-line bg-night/80 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"
    >
      <div className="relative isolate flex min-h-[340px] flex-col justify-end p-6 sm:min-h-[400px] sm:p-8">
        <Image
          src={featured.imageUrl ?? DEFAULT_BANNER_IMAGE}
          alt=""
          fill
          sizes="(min-width: 1024px) 700px, 100vw"
          className="-z-20 object-cover object-[50%_30%]"
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/70 to-ink/10" />
        <div className="flex flex-col items-start gap-4">
          <h2 id="h-recent" className="rounded-full bg-gold px-3 py-1 text-sm font-semibold text-gold-ink">
            تمت إضافته حديثًا
          </h2>
          <div className="flex flex-col gap-2">
            <p className="font-display text-4xl font-bold leading-tight sm:text-5xl">{featured.title}</p>
            <p className="flex flex-wrap gap-x-3 gap-y-1 text-[15px] text-muted">
              {meta.map((m, i) => (
                <span key={i}>{m}</span>
              ))}
            </p>
          </div>
          <button
            type="button"
            onClick={() => playQueue(items, index)}
            disabled={!featured.audioUrl}
            className="flex min-h-12 items-center gap-3 rounded-full bg-gold pe-6 ps-1.5 text-base font-semibold text-gold-ink shadow-glow transition-colors hover:bg-gold-soft disabled:opacity-40 disabled:shadow-none"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-ink text-gold">
              {featuredPlaying ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
            </span>
            {featuredPlaying ? "إيقاف مؤقت" : "استمع الآن"}
          </button>
        </div>
      </div>

      {others.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-line p-4 sm:p-5 lg:border-s lg:border-t-0">
          <p className="px-2 pb-1 text-sm font-medium text-muted">أُضيف أيضًا</p>
          <ul className="flex flex-col gap-1">
            {others.map(({ r, i }) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  className="flex w-full items-center gap-4 rounded-2xl p-2 text-start transition-colors hover:bg-raised"
                >
                  <RecordingCover recording={r} className="h-16 w-16 shrink-0 rounded-xl" />
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="truncate font-semibold">{r.title}</span>
                    <span className="truncate text-sm text-muted">{getCategory(r.category)?.title}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}