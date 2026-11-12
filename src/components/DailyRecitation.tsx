"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Recording } from "@/types";
import { pickForDate } from "@/lib/dailyPick";
import { makkahToday } from "@/lib/imamate";
import { usePlayer } from "./PlayerProvider";
import { RecordingCover } from "./RecordingCover";
import { PauseIcon, PlayIcon } from "./icons";

/**
 * تلاوة اليوم: بتتحسب في المتصفح بتاريخ مكة، عشان تتغير مع اليوم حتى لو الصفحة متخزنة من امبارح.
 */
export function DailyRecitation({ pool, pinned }: { pool: Recording[]; pinned: Record<string, Recording> }) {
  const [today, setToday] = useState<string | null>(null);
  const { current, isPlaying, playQueue } = usePlayer();
  const [copied, setCopied] = useState(false);

  useEffect(() => setToday(makkahToday(new Date())), []);
  const r = today ? pinned[today] ?? pickForDate(today, pool) : undefined;
  if (!r) return null;

  const href = `/${r.category}/${r.id}`;
  const title = r.title || r.prayerLabel || "";
  const playingNow = current?.id === r.id && isPlaying;

  const share = async () => {
    const url = `${window.location.origin}${href}`;
    const text = `تلاوة اليوم بصوت الشيخ ياسر الدوسري: ${title}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: text, url });
      } catch {
        /* المستخدم لغى */
      }
      return;
    }
    await navigator.clipboard?.writeText(`${text}\n${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section aria-labelledby="daily-title" className="glass-card flex flex-col gap-4 rounded-3xl p-5 sm:flex-row sm:items-center sm:gap-5">
      <RecordingCover recording={r} sizes="96px" className="h-20 w-20 shrink-0 rounded-2xl sm:h-24 sm:w-24" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 id="daily-title" className="text-sm font-semibold text-gold">
          تلاوة اليوم
        </h2>
        <Link href={href} className="font-display text-2xl font-bold leading-snug hover:text-gold-soft">
          {title}
        </Link>
        {r.subtitle && <p className="line-clamp-2 text-sm text-muted">{r.subtitle}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => playQueue([r], 0)}
          aria-label={`${playingNow ? "إيقاف" : "تشغيل"} ${title}`}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-ink transition-colors hover:bg-accent-hover"
        >
          {playingNow ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
        </button>
        <button type="button" onClick={share} className="min-h-12 rounded-full border border-line-strong px-4 text-sm font-semibold text-gold-soft hover:border-gold/50">
          {copied ? "تم نسخ الرابط" : "مشاركة"}
        </button>
      </div>
    </section>
  );
}
