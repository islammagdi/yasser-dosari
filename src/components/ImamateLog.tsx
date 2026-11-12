"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Prayer, Recording } from "@/types";
import { hijriMonthName, PRAYER_LABELS } from "@/lib/categories";
import { formatDuration, toArabicDigits } from "@/lib/format";
import { hijriToIso } from "@/lib/imamate";
import { isPlayable } from "@/lib/labels";
import { usePlayer } from "./PlayerProvider";
import { RecordingCover } from "./RecordingCover";
import { PauseIcon, PlayIcon } from "./icons";

/** الأسبوع بيبدأ السبت، زي التقويم في السعودية */
const WEEK = ["س", "ح", "ن", "ث", "ر", "خ", "ج"];
const WEEKDAY_NAMES = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const PRAYER_ORDER: Record<Prayer, number> = { fajr: 0, maghrib: 1, isha: 2 };
const DOT: Record<Prayer, string> = {
  fajr: "bg-[#C9A35A]",
  maghrib: "bg-[#B5674A]",
  isha: "bg-emerald dark:bg-[#6FB59A]",
};

type MonthKey = `${number}-${number}`;
const keyOf = (y: number, m: number) => `${y}-${m}` as MonthKey;

function weekdayOf(y: number, m: number, d: number): number | null {
  const iso = hijriToIso(y, m, d);
  return iso ? new Date(`${iso}T12:00:00Z`).getUTCDay() : null;
}

/**
 * سجلّ الإمامة: تقويم هجري لآخر شهور فيها تسجيلات فروض.
 * كل يوم عليه نقطة لكل صلاة اتسجلت، وبالضغط عليه بتظهر صلوات اليوم وتشتغل.
 */
export function ImamateLog({ recordings }: { recordings: Recording[] }) {
  const p = usePlayer();

  // التسجيلات متجمّعة بالشهر ثم اليوم
  const byMonth = useMemo(() => {
    const map = new Map<MonthKey, Map<number, Recording[]>>();
    for (const r of recordings) {
      if (!r.hijriYear || !r.hijriMonth || !r.hijriDay) continue;
      const k = keyOf(r.hijriYear, r.hijriMonth);
      const days = map.get(k) ?? new Map<number, Recording[]>();
      days.set(r.hijriDay, [...(days.get(r.hijriDay) ?? []), r]);
      map.set(k, days);
    }
    for (const days of map.values())
      for (const list of days.values()) list.sort((a, b) => PRAYER_ORDER[a.prayer ?? "isha"] - PRAYER_ORDER[b.prayer ?? "isha"]);
    return map;
  }, [recordings]);

  // الشهور من الأحدث للأقدم
  const months = useMemo(
    () =>
      [...byMonth.keys()]
        .map((k) => k.split("-").map(Number) as [number, number])
        .sort((a, b) => b[0] - a[0] || b[1] - a[1]),
    [byMonth],
  );

  const [monthIdx, setMonthIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  if (months.length === 0) return null;

  const [y, m] = months[monthIdx];
  const days = byMonth.get(keyOf(y, m))!;
  const lastDay = Math.max(...days.keys());
  const day = picked !== null && days.has(picked) ? picked : lastDay;
  const list = days.get(day) ?? [];

  const firstWeekday = weekdayOf(y, m, 1) ?? 0;
  const lead = (firstWeekday + 1) % 7; // السبت = ٠
  const length = hijriToIso(y, m, 30) ? 30 : 29;
  const dayWeekday = weekdayOf(y, m, day);

  const go = (delta: number) => {
    setMonthIdx((i) => Math.min(months.length - 1, Math.max(0, i + delta)));
    setPicked(null);
  };

  return (
    <section aria-labelledby="log-title" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="log-title" className="font-display text-3xl font-bold sm:text-4xl">
            سجلّ الإمامة
          </h2>
          <p className="text-muted">اختار يوم من التقويم الهجري، واسمع الصلوات اللي أمّها الشيخ فيه.</p>
        </div>
        <Link
          href="/fard"
          className="flex min-h-11 items-center rounded-full border border-line-strong px-5 text-sm font-semibold transition-colors hover:border-gold/60 hover:text-gold-soft"
        >
          كل صلوات الفروض
        </Link>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)]">
        {/* التقويم */}
        <div className="rounded-[26px] border border-line bg-raised p-5 shadow-soft sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="font-display text-2xl font-bold" aria-live="polite">
              {hijriMonthName(m)} {toArabicDigits(y)}
            </p>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => go(1)}
                disabled={monthIdx >= months.length - 1}
                aria-label="الشهر السابق"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-line-strong transition-colors hover:border-gold/60 disabled:opacity-30"
              >
                <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
              </button>
              <button
                type="button"
                onClick={() => go(-1)}
                disabled={monthIdx === 0}
                aria-label="الشهر التالي"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-line-strong transition-colors hover:border-gold/60 disabled:opacity-30"
              >
                <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center" role="grid" aria-label={`${hijriMonthName(m)} ${toArabicDigits(y)}`}>
            {WEEK.map((w) => (
              <span key={w} className="pb-1 text-xs text-muted" aria-hidden>
                {w}
              </span>
            ))}
            {Array.from({ length: lead }, (_, i) => (
              <span key={`lead-${i}`} aria-hidden />
            ))}
            {Array.from({ length }, (_, i) => {
              const d = i + 1;
              const recs = days.get(d);
              const selected = d === day;
              const cell = "flex h-12 flex-col items-center justify-center gap-1 rounded-xl text-[15px] font-semibold sm:h-14";
              if (!recs) {
                return (
                  <span key={d} className={`${cell} font-normal text-muted/60`}>
                    {toArabicDigits(d)}
                  </span>
                );
              }
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setPicked(d)}
                  aria-pressed={selected}
                  aria-label={`${toArabicDigits(d)} ${hijriMonthName(m)}: ${recs.map((r) => PRAYER_LABELS[r.prayer ?? "isha"]).join(" و")}`}
                  className={`${cell} transition-colors ${selected ? "bg-accent text-accent-ink" : "bg-fg/5 hover:bg-fg/10"}`}
                >
                  {toArabicDigits(d)}
                  <span aria-hidden className="flex h-1.5 gap-[3px]">
                    {recs.map((r) => (
                      <i key={r.id} className={`h-1.5 w-1.5 rounded-full ${selected ? "bg-accent-ink" : DOT[r.prayer ?? "isha"]}`} />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex gap-4 text-xs text-muted" aria-hidden>
            {(Object.keys(PRAYER_ORDER) as Prayer[]).map((pr) => (
              <span key={pr} className="flex items-center gap-1.5">
                <i className={`h-2 w-2 rounded-full ${DOT[pr]}`} />
                {PRAYER_LABELS[pr]}
              </span>
            ))}
          </div>
        </div>

        {/* صلوات اليوم المختار */}
        <div className="flex flex-col rounded-[26px] border border-line bg-raised p-5 shadow-soft sm:p-7">
          <p className="text-sm font-semibold text-gold">
            {dayWeekday !== null && `${WEEKDAY_NAMES[dayWeekday]} `}
            {toArabicDigits(day)} {hijriMonthName(m)} {toArabicDigits(y)} هـ
          </p>
          <p className="mb-2 font-display text-3xl font-bold">
            {list.length === 1 ? "صلاة واحدة في اليوم ده" : list.length === 2 ? "صلاتين في اليوم ده" : `${toArabicDigits(list.length)} صلوات في اليوم ده`}
          </p>
          <ul>
            {list.map((r, i) => {
              const isCurrent = p.current?.id === r.id;
              const playingNow = isCurrent && p.isPlaying;
              return (
                <li key={r.id} className={`flex items-center gap-4 py-4 ${i > 0 ? "border-t border-line" : ""}`}>
                  <RecordingCover recording={r} sizes="64px" className="h-16 w-16 shrink-0 rounded-2xl" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link href={`/${r.category}/${r.id}`} className="truncate font-display text-xl font-bold hover:text-gold-soft">
                      {r.prayerLabel ?? `صلاة ${PRAYER_LABELS[r.prayer ?? "isha"]}`}
                    </Link>
                    {r.subtitle && <span className="truncate text-sm text-muted">{r.subtitle}</span>}
                  </div>
                  {r.durationSec ? <span className="hidden shrink-0 text-sm tabular-nums text-gold sm:block">{formatDuration(r.durationSec)}</span> : null}
                  <button
                    type="button"
                    onClick={() => (isCurrent ? p.toggle() : p.playQueue(list, i))}
                    disabled={!isPlayable(r)}
                    aria-label={`${playingNow ? "إيقاف" : "تشغيل"} ${r.title}`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-40"
                  >
                    {playingNow ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
