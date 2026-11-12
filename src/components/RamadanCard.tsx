"use client";

import { useEffect, useState } from "react";
import type { ImamateSlot, NightPart, Recording } from "@/types";
import { toArabicDigits } from "@/lib/format";
import { IMAMATE_PRAYER_LABELS, addDays, daysFromToday, isRamadan, makkahTime, makkahToday, relativeDayLabel } from "@/lib/imamate";
import { usePlayer } from "./PlayerProvider";
import { RamadanCountdown } from "./RamadanCountdown";
import { PauseIcon, PlayIcon } from "./icons";

const PART_SHORT: Record<NightPart, string> = { first: "الأولى", second: "الثانية", last: "الأخيرة مع الوتر" };
const PART_ORDER: Record<NightPart, number> = { first: 0, second: 1, last: 2 };

/** الكارت بيظهر في رمضان، أو قبله بشهر لو الجدول اتعلن */
const SHOW_BEFORE_DAYS = 30;

interface Night {
  night: number;
  parts: ImamateSlot[];
  past: boolean;
  /** مساء الليلة (ليلة ١١ = مساء يوم ١٠) */
  evening: string;
}

/** ليالي الشيخ في رمضان: جدوله كله مرة واحدة، والليلة الجاية متعلّمة، وكل ليلة اتسجلت بتشتغل */
export function RamadanCard({ slots, recordings }: { slots: ImamateSlot[]; recordings: Recording[] }) {
  const p = usePlayer();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  if (!now) return null;

  const today = makkahToday(now);
  const time = makkahTime(now);
  const isPast = (s: ImamateSlot) => s.date < today || (s.date === today && !!s.time && s.time <= time);

  const ramadanSlots = slots.filter((s) => s.ramadanNight && s.ramadanYear && s.nightOf);
  if (!ramadanSlots.length) return <RamadanCountdown now={now} />;

  // السنة اللي فيها ليالي لسه مجتش، ولو كله عدّى نعرض آخر سنة في رمضان نفسه بس
  const forceShow = isRamadan(now);
  const years = [...new Set(ramadanSlots.filter((s) => !isPast(s)).map((s) => s.ramadanYear!))].sort();
  const year = years[0] ?? (forceShow ? Math.max(...ramadanSlots.map((s) => s.ramadanYear!)) : undefined);
  if (!year) return <RamadanCountdown now={now} />;

  const ofYear = ramadanSlots.filter((s) => s.ramadanYear === year);
  const firstEvening = ofYear.map((s) => addDays(s.nightOf!, -1)).sort()[0];
  if (!forceShow && daysFromToday(firstEvening, now) > SHOW_BEFORE_DAYS) return <RamadanCountdown now={now} />;

  const nights: Night[] = Object.values(
    ofYear.reduce<Record<number, ImamateSlot[]>>((acc, s) => {
      (acc[s.ramadanNight!] ??= []).push(s);
      return acc;
    }, {}),
  )
    .map((parts) => ({
      night: parts[0].ramadanNight!,
      parts: parts.sort((a, b) => (a.prayer === b.prayer ? PART_ORDER[a.part!] - PART_ORDER[b.part!] : a.prayer === "taraweeh" ? -1 : 1)),
      past: parts.every(isPast),
      evening: addDays(parts[0].nightOf!, -1),
    }))
    .sort((a, b) => a.night - b.night);

  const next = nights.find((n) => !n.past);
  const nextLabel = next ? (daysFromToday(next.evening, now) <= 0 ? "الليلة" : relativeDayLabel(next.evening, now)) : null;

  // تسجيل الليلة من التراويح (لو اتسجلت واترفعت)
  const recordingOf = (night: number) => recordings.find((r) => r.hijriYear === year && r.night === night);

  return (
    <section aria-labelledby="ramadan-title" className="glass-card relative overflow-hidden rounded-3xl border-gold/40 p-4 sm:p-6">
      <div aria-hidden className="pattern-stars absolute inset-0 -z-10 opacity-10" />
      <div className="flex flex-col gap-1 pb-4">
        <h2 id="ramadan-title" className="font-display text-2xl font-bold text-gold-soft sm:text-3xl">
          ليالي الشيخ في رمضان {toArabicDigits(year)} هـ
        </h2>
        <p className="text-sm text-muted">حسب الجدول المعلن من رئاسة الشؤون الدينية</p>
      </div>

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {nights.map((n) => {
          const isNext = n === next;
          const rec = n.past ? recordingOf(n.night) : undefined;
          const playingNow = !!rec && p.current?.id === rec.id && p.isPlaying;
          const body = (
            <>
              <span className="flex items-center justify-between gap-2">
                <span className="font-display text-xl font-bold">ليلة {toArabicDigits(n.night)}</span>
                {isNext && nextLabel && (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-ink">{nextLabel}</span>
                )}
                {rec && (playingNow ? <PauseIcon className="h-4 w-4 text-gold" /> : <PlayIcon className="h-4 w-4 text-gold" />)}
              </span>
              {n.parts.map((s) => (
                <span key={s.id} className="text-xs leading-5 text-muted">
                  {IMAMATE_PRAYER_LABELS[s.prayer]}: {PART_SHORT[s.part!]}
                </span>
              ))}
            </>
          );
          const cls = `flex h-full w-full flex-col gap-1 rounded-2xl border p-3 text-start transition-colors ${
            isNext ? "border-gold bg-gold/10" : n.past ? "border-fg/5 opacity-60" : "border-fg/10"
          }`;
          return (
            <li key={n.night}>
              {rec ? (
                <button
                  type="button"
                  onClick={() => (p.current?.id === rec.id ? p.toggle() : p.playQueue([rec], 0))}
                  aria-label={`${playingNow ? "إيقاف" : "تشغيل"} تسجيل ليلة ${toArabicDigits(n.night)}`}
                  className={`${cls} hover:border-gold/50 hover:opacity-100`}
                >
                  {body}
                </button>
              ) : (
                <div className={cls}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}