"use client";

import { useEffect, useState } from "react";
import type { ImamateSlot } from "@/types";
import { IMAMATE_PRAYER_LABELS, hijriDayLabel, nextSlot, prayersList, relativeDayLabel } from "@/lib/imamate";
import { CategoryIcon } from "./icons";

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

  return (
    <div className="glass-card flex items-center gap-3 rounded-2xl p-3 pe-4" aria-live="polite">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold/30 bg-emerald/40 text-gold">
        <CategoryIcon category="fard" className="h-6 w-6" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-xs text-muted">الإمامة القادمة في المسجد الحرام</span>
        {now === null ? (
          <span aria-hidden className="my-1 h-4 w-52 max-w-full animate-pulse rounded bg-white/10" />
        ) : slot ? (
          <>
            <span className="font-semibold leading-6 sm:text-[17px]">
              صلاة {IMAMATE_PRAYER_LABELS[slot.prayer]}، {hijriDayLabel(slot.date)}
            </span>
            {slot.weekPrayers && slot.weekPrayers.length > 1 && (
              <span className="text-xs text-muted">يؤم هذا الأسبوع {slot.weekPrayers.length === 2 ? "صلاتي" : "صلوات"} {prayersList(slot.weekPrayers)}</span>
            )}
          </>
        ) : (
          <span className="text-sm leading-6">لا توجد إمامة معلنة حاليًا، ويُعلن الجدول أسبوعيًا.</span>
        )}
      </span>
      {now && slot && (
        <span className="shrink-0 rounded-full bg-gold px-3 py-1 text-xs font-semibold text-gold-ink">
          {relativeDayLabel(slot.date, now)}
        </span>
      )}
    </div>
  );
}