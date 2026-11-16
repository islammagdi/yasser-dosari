"use client";

import Link from "next/link";
import { recitationsLabel } from "@/lib/format";
import { isPlayable } from "@/lib/labels";
import { usePlaylists } from "@/lib/usePlaylists";
import { usePlayer } from "./PlayerProvider";
import { PauseIcon, PlayIcon } from "./icons";

/** نفس ألوان كروت المجموعات، بالتناوب */
const TONES = ["from-[#1E4A3C] to-[#0F2A21]", "from-[#6B4A1A] to-[#3A2810]", "from-[#24384A] to-[#121D28]", "from-[#4A1E2C] to-[#26101A]"];

/**
 * قوايم الزائر في الرئيسية: نفس شكل «مجموعات للاستماع»، بس دي قوايمه هو (محفوظة على جهازه).
 * مبتظهرش غير لو عنده قايمة فيها تلاوات.
 */
export function HomePlaylists() {
  const pl = usePlaylists();
  const p = usePlayer();
  const lists = pl.lists.filter((l) => l.items.length > 0);
  if (!pl.ready || lists.length === 0) return null;

  return (
    <section aria-labelledby="my-playlists-title" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="my-playlists-title" className="font-display text-3xl font-bold sm:text-4xl">
            قوايمك
          </h2>
          <p className="text-muted">القوايم اللي عملتها، محفوظة على جهازك.</p>
        </div>
        <Link
          href="/playlists"
          className="flex min-h-11 items-center rounded-full border border-line-strong px-5 text-sm font-semibold transition-colors hover:border-gold/60 hover:text-gold-soft"
        >
          كل القوايم
        </Link>
      </div>

      <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
        {lists.map((l, i) => {
          const playable = l.items.filter(isPlayable);
          const inThis = !!p.current && l.items.some((r) => r.id === p.current!.id);
          const playingNow = inThis && p.isPlaying;
          return (
            <li
              key={l.id}
              className={`relative isolate flex h-[220px] w-[70%] shrink-0 snap-start flex-col justify-end overflow-hidden rounded-[28px] bg-gradient-to-b p-6 text-[#F1EEE6] sm:w-auto ${TONES[i % TONES.length]}`}
            >
              <span aria-hidden className="pattern-stars absolute inset-0 -z-10 opacity-[0.16]" />
              <div className="flex items-end gap-3">
                <div className="flex min-w-0 flex-1 flex-col">
                  <Link
                    href={`/playlists#pl-${l.id}`}
                    className="line-clamp-2 font-display text-2xl font-bold leading-snug after:absolute after:inset-0 hover:text-[#E7CD94]"
                  >
                    {l.name}
                  </Link>
                  <span className="text-[13px] text-[#F1EEE6]/75">{recitationsLabel(l.items.length)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => (inThis ? p.toggle() : p.playQueue(playable, 0))}
                  disabled={!playable.length}
                  aria-label={`${playingNow ? "إيقاف" : "تشغيل"} قايمة ${l.name}`}
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
