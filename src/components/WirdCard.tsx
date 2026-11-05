"use client";

import { useEffect, useState } from "react";
import type { Recording } from "@/types";
import { toArabicDigits } from "@/lib/format";
import { surahName } from "@/lib/quran";
import { siteUrl } from "@/lib/site";
import { useWird } from "@/lib/useWird";
import { WIRD_DURATIONS, localToday, surahPages, wirdGoogleUrl, wirdIcs } from "@/lib/wird";
import { usePlayer } from "./PlayerProvider";
import { ClockIcon, PlayIcon } from "./icons";

const DISMISS_KEY = "yd-wird-dismissed";

const durationLabel = (d: number) =>
  d === 7 ? "أسبوع" : d === 30 ? "شهر" : d === 60 ? "شهرين" : `${toArabicDigits(d)} يومًا`;

/**
 * الورد اليومي: لو مفيش خطة بيعرض اختيار المدة، ولو فيه بيعرض سور النهارده وزرار تشغيلها.
 * items = تسجيلات المصحف (الصوت قبل الفيديو).
 * dismissible = في الرئيسية: الزائر يقدر يخفي الدعوة لو مش مهتم.
 */
export function WirdCard({ items, dismissible = false }: { items: Recording[]; dismissible?: boolean }) {
  const w = useWird();
  const p = usePlayer();
  const [dismissed, setDismissed] = useState(true);
  const [time, setTime] = useState("20:00");

  useEffect(() => {
    try {
      setDismissed(dismissible && localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, [dismissible]);

  if (!w.ready) return null;

  // تسجيل لكل سورة: النسخة الصوتية لو موجودة، وإلا الفيديو
  const bySurah = new Map<number, Recording>();
  for (const r of [...items].sort((a, b) => Number(!!a.youtubeId) - Number(!!b.youtubeId))) {
    if (r.surah && !bySurah.has(r.surah)) bySurah.set(r.surah, r);
  }

  const durations = (onPick: (d: number) => void) => (
    <div className="flex flex-wrap gap-2">
      {WIRD_DURATIONS.map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onPick(d)}
          className="min-h-11 rounded-full border border-line-strong px-5 text-[15px] font-semibold text-gold-soft transition-colors hover:border-gold/60 hover:bg-gold/10"
        >
          {durationLabel(d)}
        </button>
      ))}
    </div>
  );

  // ---- مفيش خطة: دعوة ----
  if (!w.plan) {
    if (dismissed) return null;
    return (
      <section aria-labelledby="wird-title" className="glass-card flex flex-col gap-4 rounded-3xl p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 id="wird-title" className="font-display text-2xl font-bold text-gold-soft">
            ورد يومي لختم المصحف
          </h2>
          <p className="leading-7 text-muted">
            اختر مدة الختمة، ونقسّم لك المصحف على الأيام، وتسمع وردك كل يوم بصوت الشيخ.
            {w.khatmaCount > 0 && ` السور التي سمعتها (${toArabicDigits(w.khatmaCount)}) محسوبة من ختمتك.`}
          </p>
        </div>
        <p className="text-sm font-semibold">أختم المصحف في:</p>
        {durations(w.start)}
        {dismissible && (
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.setItem(DISMISS_KEY, "1");
              } catch {
                /* تجاهل */
              }
              setDismissed(true);
            }}
            className="self-start text-sm text-muted underline-offset-4 hover:text-text hover:underline"
          >
            ليس الآن
          </button>
        )}
      </section>
    );
  }

  // ---- الختمة خلصت ----
  if (w.finished) {
    return (
      <section aria-labelledby="wird-title" className="glass-card flex flex-col gap-4 rounded-3xl p-5 sm:p-6">
        <h2 id="wird-title" className="font-display text-2xl font-bold text-gold-soft">
          أتممت الختمة، تقبّل الله منك
        </h2>
        <p className="text-sm font-semibold">ابدأ ختمة جديدة في:</p>
        {durations(w.restart)}
        <button type="button" onClick={w.stop} className="self-start text-sm text-muted underline-offset-4 hover:text-text hover:underline">
          إنهاء الخطة
        </button>
      </section>
    );
  }

  // ---- ورد النهارده ----
  const pending = w.surahs.filter((n) => !w.doneToday.includes(n));
  const allDone = w.surahs.length > 0 && pending.length === 0;
  const pages = Math.round(w.surahs.reduce((s, n) => s + surahPages(n), 0));
  const queue = pending.map((n) => bySurah.get(n)).filter((r): r is Recording => !!r);

  const downloadIcs = () => {
    const url = URL.createObjectURL(wirdIcs(localToday(), w.daysLeft, time, siteUrl));
    const a = document.createElement("a");
    a.href = url;
    a.download = "wird.ics";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section aria-labelledby="wird-title" className="glass-card flex flex-col gap-4 rounded-3xl p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="wird-title" className="font-display text-2xl font-bold text-gold-soft">
          {allDone ? "أتممت ورد اليوم" : "وردك اليوم"}
        </h2>
        <span className="text-sm text-muted">
          {w.overdue
            ? `اليوم ${toArabicDigits(w.dayNumber)} · تجاوزت المدة، نكمل بنفس المعدّل`
            : `اليوم ${toArabicDigits(w.dayNumber)} من ${toArabicDigits(w.plan.days)}`}
        </span>
      </div>

      <ul aria-label="سور ورد اليوم" className="flex flex-wrap gap-2">
        {w.surahs.map((n) => {
          const done = w.doneToday.includes(n);
          return (
            <li
              key={n}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-sm ${
                done ? "bg-gold/15 text-gold-soft" : "bg-white/5 text-text"
              }`}
            >
              {done && <span aria-hidden>✓</span>}
              سورة {surahName(n)}
              {done && <span className="sr-only">(تم الاستماع)</span>}
            </li>
          );
        })}
      </ul>
      {!allDone && <p className="text-sm text-muted">حوالي {toArabicDigits(pages)} صفحة</p>}

      <div className="flex flex-col gap-1.5">
        <div
          role="progressbar"
          aria-label="تقدّم الختمة"
          aria-valuemin={0}
          aria-valuemax={114}
          aria-valuenow={w.khatmaCount}
          className="h-1.5 overflow-hidden rounded-full bg-white/10"
        >
          <div className="h-full rounded-full bg-gold transition-[width] duration-500" style={{ width: `${Math.round((w.khatmaCount / 114) * 100)}%` }} />
        </div>
        <p className="text-xs text-muted">
          الختمة: {toArabicDigits(w.khatmaCount)} من ١١٤ سورة · السورة تُحسب عند سماع ٩٠٪ منها
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {!allDone && queue.length > 0 && (
          <button
            type="button"
            onClick={() => p.playQueue(queue, 0)}
            className="flex min-h-11 items-center gap-2 rounded-full bg-gold pe-5 ps-2 text-[15px] font-semibold text-gold-ink transition-colors hover:bg-gold-soft"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-ink text-gold">
              <PlayIcon className="h-4 w-4" />
            </span>
            {w.doneToday.length ? "أكمل وردك" : "استمع لوردك"}
          </button>
        )}

        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-line-strong px-4 text-sm font-semibold text-gold-soft transition-colors hover:border-gold/50">
            <ClockIcon className="h-4 w-4" />
            ذكّرني يوميًا
          </summary>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-muted">
              الساعة
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value || "20:00")}
                className="min-h-10 rounded-xl border border-line-strong bg-transparent px-3 text-text"
              />
            </label>
            <a
              href={wirdGoogleUrl(localToday(), w.daysLeft, time, siteUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center rounded-full bg-white/5 px-4 text-sm hover:bg-white/10"
            >
              تقويم Google
            </a>
            <button type="button" onClick={downloadIcs} className="min-h-10 rounded-full bg-white/5 px-4 text-sm hover:bg-white/10">
              تقويم الجهاز
            </button>
          </div>
        </details>

        <button
          type="button"
          onClick={() => {
            if (window.confirm("إيقاف خطة الورد؟ تقدّم الختمة سيبقى محفوظًا.")) w.stop();
          }}
          className="ms-auto text-sm text-muted underline-offset-4 hover:text-text hover:underline"
        >
          إيقاف الخطة
        </button>
      </div>
    </section>
  );
}