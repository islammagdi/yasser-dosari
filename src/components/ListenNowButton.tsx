"use client";

import type { Recording } from "@/types";
import { usePlayer } from "./PlayerProvider";
import { PauseIcon, PlayIcon } from "./icons";

/** يكمّل آخر تلاوة لو فيه، وإلا يشغّل أول عنصر في القايمة اللي اتبعتت */
export function ListenNowButton({ fallback }: { fallback: Recording[] }) {
  const { current, isPlaying, toggle, playQueue } = usePlayer();
  const resuming = !!current;
  const label = isPlaying ? "إيقاف مؤقت" : resuming ? "كمّل الاستماع" : "استمع الآن";
  const disabled = !resuming && !fallback[0]?.audioUrl;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => (resuming ? toggle() : playQueue(fallback, 0))}
         className="flex min-h-12 items-center gap-3 rounded-full bg-gold pe-6 ps-1.5 text-base font-semibold text-gold-ink shadow-glow transition-colors hover:bg-gold-soft disabled:opacity-40 disabled:shadow-none"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-ink text-gold">
        {isPlaying ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
      </span>
      {label}
    </button>
  );
}
