"use client";

import { useEffect, useState } from "react";
import type { ImamateSlot } from "@/types";
import { IMAMATE_PRAYER_LABELS, NIGHT_PART_LABELS, addDays, hijriDayLabel, nextSlot, prayersList, relativeDayLabel } from "@/lib/imamate";
import { ImamateReminder } from "./ImamateReminder";
import { ClockIcon, MosqueIcon } from "./icons";

/** التراويح والتهجد بالليل: لو ليلتها النهارده بنقول "الليلة" */
function nightLabel(slot: ImamateSlot, now: Date): string {
  if (slot.prayer !== "taraweeh" && slot.prayer !== "tahajjud") return relativeDayLabel(slot.date, now);
  // مساء الليلة: للتراويح هو تاريخها، وللتهجد اليوم اللي قبله (لأنه بعد نص الليل)
  const evening = slot.prayer === "taraweeh" ? slot.date : addDays(slot.date, -1);
  if (relativeDayLabel(evening, now) === "اليوم" || relativeDayLabel(slot.date, now) === "اليوم") return "الليلة";
  return relativeDayLabel(evening, now);
}

/** أقرب صلاة هيؤم فيها الشيخ المصلين، من الجدول الأسبوعي */
export function NextImamate({ slots }: { slots: ImamateSlot[] }) {
  // الوقت بيتحسب في المتصفح بس، عشان الصفحة متتخزّنش بتاريخ قديم
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const slot = now ? nextSlot(slots, now) : null;
  const divider = <span aria-hidden className="hidden h-12 w-px shrink-0 bg-gold/25 sm:block" />;

  return (
    <div
      className="flex items-center gap-4 rounded-3xl border border-gold/30 bg-ink/45 p-4 backdrop-blur-md sm:gap-5 sm:px-6"
      aria-live="polite"
    >
      <MosqueIcon className="h-9 w-9 shrink-0 text-gold sm:h-10 sm:w-10" />
      {divider}
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-sm text-gold-soft">الإمامة القادمة في المسجد الحرام</span>
        {now === null ? (
          <span aria-hidden className="my-1 h-4 w-52 max-w-full animate-pulse rounded bg-white/10" />
        ) : slot ? (
          <>
            <span className="font-semibold leading-6 sm:text-[17px]">
              صلاة {IMAMATE_PRAYER_LABELS[slot.prayer]}، {slot.nightOf ? `ليلة ${hijriDayLabel(slot.nightOf)}` : hijriDayLabel(slot.date)}
            </span>
            {slot.part && <span className="text-sm text-gold-soft">{NIGHT_PART_LABELS[slot.part]}</span>}
            {slot.weekPrayers && slot.weekPrayers.length > 1 && (
              <span className="text-xs text-muted">
                يؤم هذا الأسبوع {slot.weekPrayers.length === 2 ? "صلاتي" : "صلوات"} {prayersList(slot.weekPrayers)}
              </span>
            )}
            <ImamateReminder slot={slot} />
          </>
        ) : (
          <span className="text-sm leading-6">لا توجد إمامة معلنة حاليًا، ويُعلن الجدول أسبوعيًا.</span>
        )}
      </span>
      {now && slot && (
        <>
          {divider}
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-gold px-3.5 py-1.5 text-sm font-semibold text-gold-ink">
            <ClockIcon className="h-4 w-4" />
            {nightLabel(slot, now)}
          </span>
        </>
      )}
    </div>
  );
}