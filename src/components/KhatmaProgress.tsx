"use client";

import type { Recording } from "@/types";
import { toArabicDigits } from "@/lib/format";
import { surahName } from "@/lib/quran";
import { khatmaCountLabel, useKhatma } from "@/lib/useKhatma";
import { usePlayer } from "./PlayerProvider";
import { PlayIcon } from "./icons";

/** متابعة الختمة في صفحة المصحف: كام سورة اتسمعت، وزرار "كمّل" */
export function KhatmaProgress({ items }: { items: Recording[] }) {
  const k = useKhatma();
  const p = usePlayer();
  if (!k.ready) return null;

  const total = 114;
  const pct = Math.round((k.count / total) * 100);
  const finished = k.count >= total;

  // "كمّل": من النسخة الصوتية لو موجودة، والتشغيل بيكمّل على السور اللي بعدها
  const audio = items.filter((r) => r.surah && !r.youtubeId);
  const queue = (audio.length ? audio : items.filter((r) => r.surah)).sort((a, b) => a.surah! - b.surah!);
  const start = k.nextSurah ? queue.findIndex((r) => r.surah === k.nextSurah) : -1;

  return (
    <div className="glass-card flex flex-col gap-4 rounded-3xl p-5 sm:flex-row sm:items-center sm:gap-6">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-semibold">
            {finished ? "أتممت الاستماع للمصحف كاملًا، تقبّل الله منك" : "ختمتك"}
          </p>
          <p className="shrink-0 text-sm text-muted">
            {toArabicDigits(k.count)} من {toArabicDigits(total)} سورة
          </p>
        </div>
        {k.completed > 0 && (
          <p className="text-sm text-gold-soft">أتممت حتى الآن {khatmaCountLabel(k.completed, toArabicDigits)} بصوت الشيخ</p>
        )}
        <div
          role="progressbar"
          aria-label="تقدّم الختمة"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={k.count}
          className="h-2 overflow-hidden rounded-full bg-white/10"
        >
          <div className="h-full rounded-full bg-gold transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-muted">السورة بتتحسب لما تسمع ٩٠٪ منها. التقدّم محفوظ على جهازك.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {!finished && start >= 0 && (
          <button
            type="button"
            onClick={() => p.playQueue(queue, start)}
            className="flex min-h-11 items-center gap-2 rounded-full bg-gold pe-5 ps-2 text-[15px] font-semibold text-gold-ink transition-colors hover:bg-gold-soft"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-ink text-gold">
              <PlayIcon className="h-4 w-4" />
            </span>
            {k.count ? "كمّل" : "ابدأ"} من سورة {surahName(k.nextSurah!)}
          </button>
        )}
        {k.count > 0 && (
          <button
            type="button"
            onClick={() => window.confirm("تبدأ ختمة جديدة؟ هيتمسح التقدّم الحالي.") && k.reset()}
            className="flex min-h-11 items-center rounded-full border border-white/15 px-5 text-[15px] text-muted transition-colors hover:text-text"
          >
            ختمة جديدة
          </button>
        )}
      </div>
    </div>
  );
}