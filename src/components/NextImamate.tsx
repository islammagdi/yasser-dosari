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

/**
 * أقرب صلاة هيؤم فيها الشيخ المصلين، من الجدول الأسبوعي.
 * من غير حاوية: الهيرو هو اللي بيحطها جوه الشريط.
 */
export function NextImamate({ slots }: { slots: ImamateSlot[] }) {
  // الوقت بيتحسب في المتصفح بس، عشان الصفحة متتخزّنش بتاريخ قديم
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const slot = now ? nextSlot(slots, now) : null;

  return (
    <div className="flex min-w-0 flex-col gap-3.5 lg:flex-row lg:items-center lg:gap-4" aria-live="polite">
      <div className="flex min-w-0 flex-1 items-start gap-3 lg:items-center lg:gap-4">
        <MosqueIcon className="h-8 w-8 shrink-0 text-gold lg:h-9 lg:w-9" />
        <span className="flex min-w-0 flex-col gap-0.5 lg:gap-1">
          <span className="text-xs text-gold-soft lg:text-[13px]">الإمامة القادمة في المسجد الحرام</span>
          {now === null ? (
            <span aria-hidden className="my-1 h-4 w-52 max-w-full animate-pulse rounded bg-white/10" />
          ) : slot ? (
            <>
              <span className="font-semibold leading-6 lg:text-[17px]">
                صلاة {IMAMATE_PRAYER_LABELS[slot.prayer]}، {slot.nightOf ? `ليلة ${hijriDayLabel(slot.nightOf)}` : hijriDayLabel(slot.date)}
              </span>
              {slot.part && <span className="text-sm text-gold-soft">{NIGHT_PART_LABELS[slot.part]}</span>}
              <span className="flex flex-wrap items-center gap-x-1.5 text-[13px] leading-6 text-muted">
                <ClockIcon className="h-3.5 w-3.5 shrink-0 text-gold" />
                <span className="text-text">{nightLabel(slot, now)}</span>
                {slot.weekPrayers && slot.weekPrayers.length > 1 && (
                  <span>
                    · يؤم هذا الأسبوع {slot.weekPrayers.length === 2 ? "صلاتي" : "صلوات"} {prayersList(slot.weekPrayers)}
                  </span>
                )}
              </span>
            </>
          ) : (
            <span className="text-sm leading-6">لا توجد إمامة معلنة حاليًا، ويُعلن الجدول أسبوعيًا.</span>
          )}
        </span>
      </div>

      {now && slot && (
        <div className="shrink-0 self-end lg:self-auto">
          <ImamateReminder slot={slot} />
        </div>
      )}
    </div>
  );
}