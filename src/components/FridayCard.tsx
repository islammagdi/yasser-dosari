"use client";

import { useEffect, useState } from "react";
import type { ImamateSlot } from "@/types";
import { daysFromToday, hijriDayLabel, isNowLive, makkahTime, makkahToday, relativeDayLabel } from "@/lib/imamate";
import { MAKKAH_LIVE_URL } from "@/lib/site";
import { ImamateReminder } from "./ImamateReminder";

/**
 * كارت "الجمعة": بيظهر بس لو الشيخ خطيب وإمام في جمعة خلال الأسبوع الجاي (الاحتياطي مش بيظهر هنا).
 */
export function FridayCard({ slots }: { slots: ImamateSlot[] }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  if (!now) return null;

  const today = makkahToday(now);
  const time = makkahTime(now);
  const friday = slots
    .filter((s) => s.prayer === "jumuah" && !s.backup)
    .filter((s) => s.date > today || (s.date === today && (!s.time || s.time > time)))
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  if (!friday || daysFromToday(friday.date, now) > 7) return null;

  const live = isNowLive(friday, now);
  const when = daysFromToday(friday.date, now) === 0 ? "اليوم" : relativeDayLabel(friday.date, now);

  return (
    <section aria-labelledby="friday-title" className="glass-card flex flex-col gap-4 rounded-3xl border-gold/30 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-gold">{live ? "الآن في المسجد الحرام" : `الجمعة · ${when}`}</p>
        <h2 id="friday-title" className="font-display text-2xl font-bold leading-snug">
          الشيخ يخطب ويؤم صلاة الجمعة
        </h2>
        <p className="text-sm text-muted">{hijriDayLabel(friday.date)} · المسجد الحرام</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {live && MAKKAH_LIVE_URL ? (
          <a
            href={MAKKAH_LIVE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center rounded-full bg-gold px-5 text-sm font-semibold text-gold-ink hover:bg-gold-soft"
          >
            شاهد البث المباشر
          </a>
        ) : (
          <ImamateReminder slot={friday} />
        )}
      </div>
    </section>
  );
}
