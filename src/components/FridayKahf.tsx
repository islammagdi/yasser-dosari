"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Recording } from "@/types";
import { usePlayer } from "./PlayerProvider";
import { RecordingCover } from "./RecordingCover";
import { EqualizerIcon, PauseIcon, PlayIcon } from "./icons";

/** يوم الجمعة (من مغرب الخميس تقريبًا) بنعرض كارت سورة الكهف بتوقيت جهاز الزائر */
function isFridayTime(d: Date): boolean {
  const day = d.getDay(); // 4 = الخميس، 5 = الجمعة
  return day === 5 || (day === 4 && d.getHours() >= 18);
}

export function FridayKahf({ kahf }: { kahf: Recording | null }) {
  const p = usePlayer();
  // بنقرر بعد ما الصفحة تفتح في المتصفح، عشان اليوم يتحسب بتوقيت الزائر مش السيرفر
  const [show, setShow] = useState(false);
  useEffect(() => setShow(isFridayTime(new Date())), []);

  if (!show || !kahf) return null;
  const isCurrent = p.current?.id === kahf.id;
  const playingNow = isCurrent && p.isPlaying;

  return (
    <section
      aria-labelledby="kahf-title"
      className="glass-card relative flex items-center gap-4 rounded-3xl border-gold/40 p-4 sm:gap-5 sm:p-5"
    >
      <span className="relative h-16 w-16 shrink-0 sm:h-20 sm:w-20">
        <RecordingCover recording={kahf} sizes="80px" className="h-full w-full rounded-2xl" />
        {playingNow && (
          <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-ink/60">
            <EqualizerIcon className="h-6 w-6 text-gold" />
          </span>
        )}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-sm font-medium text-gold">يوم الجمعة</p>
        <h2 id="kahf-title" className="font-display text-2xl font-bold sm:text-3xl">
          سورة الكهف
        </h2>
        <p className="truncate text-sm text-muted">بصوت الشيخ ياسر الدوسري</p>
      </div>
      <button
        type="button"
        onClick={() => (isCurrent ? p.toggle() : p.playQueue([kahf], 0))}
        aria-label={playingNow ? "إيقاف سورة الكهف" : "تشغيل سورة الكهف"}
        className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gold text-gold-ink shadow-glow transition-colors hover:bg-gold-soft"
      >
        {playingNow ? <PauseIcon className="h-6 w-6" /> : <PlayIcon className="h-6 w-6" />}
      </button>
      <Link href={`/${kahf.category}/${kahf.id}`} aria-label="صفحة سورة الكهف" className="absolute inset-0 rounded-3xl" />
    </section>
  );
}