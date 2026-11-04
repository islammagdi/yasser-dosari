"use client";

import Link from "next/link";
import { formatDuration } from "@/lib/format";
import { clearProgress, useInProgress } from "@/lib/useProgress";
import { usePlayer } from "./PlayerProvider";
import { RecordingCover } from "./RecordingCover";
import { PauseIcon, PlayIcon } from "./icons";

/** "أكمل الاستماع": التلاوات اللي الزائر بدأها ومكمّلهاش. مش بيظهر خالص لو مفيش */
export function ContinueListening() {
  const items = useInProgress(4);
  const { current, isPlaying, playQueue } = usePlayer();
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="continue-title" className="flex flex-col gap-4">
      <h2 id="continue-title" className="px-1 font-display text-2xl font-bold text-gold-soft">
        أكمل الاستماع
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ rec, t, d }) => {
          const playingNow = current?.id === rec.id && isPlaying;
          return (
            <li key={rec.id} className="glass-card relative flex flex-col gap-3 rounded-2xl p-3">
              <div className="flex items-center gap-3">
                <RecordingCover recording={rec} sizes="56px" className="h-14 w-14 shrink-0 rounded-xl" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <Link
                    href={`/${rec.category}/${rec.id}`}
                    className="line-clamp-2 text-[15px] font-semibold leading-6 after:absolute after:inset-0 after:rounded-2xl hover:text-gold-soft"
                  >
                    {rec.title}
                  </Link>
                  <span className="text-xs text-muted">متبقٍ {formatDuration(d - t)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => playQueue([rec], 0)}
                  aria-label={`${playingNow ? "إيقاف" : "أكمل"} ${rec.title}`}
                  className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold text-gold-ink transition-colors hover:bg-gold-soft"
                >
                  {playingNow ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span aria-hidden className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                  <span className="block h-full rounded-full bg-gold" style={{ width: `${Math.round((t / d) * 100)}%` }} />
                </span>
                <button
                  type="button"
                  onClick={() => clearProgress(rec.id)}
                  className="relative z-10 min-h-8 rounded-full px-2 text-xs text-muted transition-colors hover:text-text"
                >
                  إخفاء
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}