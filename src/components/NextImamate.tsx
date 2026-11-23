"use client";

import { useL } from "@/lib/i18n/client";
import type { L } from "@/lib/i18n";
import Link from "@/lib/i18n/nav";
import { useEffect, useState } from "react";
import type { ImamateSlot } from "@/types";
import { IMAMATE_PRAYER_LABELS, NIGHT_PART_LABELS, addDays, isNowLive, nextSlot } from "@/lib/imamate";
import { MAKKAH_LIVE_URL } from "@/lib/site";
import { ImamateReminder } from "./ImamateReminder";
import { ClockIcon, MosqueIcon } from "./icons";

/** التراويح والتهجد بالليل: لو ليلتها النهارده بنقول "الليلة" */
function nightLabel(slot: ImamateSlot, now: Date, { t, relativeDayLabel }: L): string {
  if (slot.prayer !== "taraweeh" && slot.prayer !== "tahajjud") return relativeDayLabel(slot.date, now);
  // مساء الليلة: للتراويح هو تاريخها، وللتهجد اليوم اللي قبله (لأنه بعد نص الليل)
  const evening = slot.prayer === "taraweeh" ? slot.date : addDays(slot.date, -1);
  if (relativeDayLabel(evening, now) === t("اليوم") || relativeDayLabel(slot.date, now) === t("اليوم")) return t("الليلة");
  return relativeDayLabel(evening, now);
}

/**
 * أقرب صلاة هيؤم فيها الشيخ المصلين، من الجدول الأسبوعي.
 * من غير حاوية: الهيرو هو اللي بيحطها جوه الشريط.
 */
export function NextImamate({ slots }: { slots: ImamateSlot[] }) {
  const l = useL();
  const { t, prayerTitle, hijriDayLabel, prayersList } = l;
  // الوقت بيتحسب في المتصفح بس، عشان الصفحة متتخزّنش بتاريخ قديم
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const slot = now ? nextSlot(slots, now) : null;
  const live = !!(now && slot && isNowLive(slot, now));

  // وقت الصلاة نفسه: الخانة بتتحول لـ "الآن"، وزرار التذكير بيتبدل برابط البث المباشر
  if (live && slot) {
    return (
      <div className="flex min-w-0 flex-col gap-3.5 lg:flex-row lg:items-center lg:gap-4" aria-live="polite">
        <div className="flex min-w-0 flex-1 items-center gap-3 lg:gap-4">
          <span aria-hidden className="relative flex h-8 w-8 shrink-0 items-center justify-center lg:h-9 lg:w-9">
            <span className="absolute h-3 w-3 animate-ping rounded-full bg-gold/60 motion-reduce:animate-none" />
            <span className="relative h-3 w-3 rounded-full bg-accent" />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5 lg:gap-1">
            <span className="text-xs font-semibold text-gold lg:text-[13px]">{t("الآن في المسجد الحرام")}</span>
            <span className="font-semibold leading-6 lg:text-[17px]">{prayerTitle(slot.prayer)}  {t("بإمامة الشيخ")}</span>
            {slot.part && <span className="text-sm text-gold-soft">{t(NIGHT_PART_LABELS[slot.part])}</span>}
          </span>
        </div>
        {MAKKAH_LIVE_URL && (
          <a
            href={MAKKAH_LIVE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-10 inline-flex min-h-11 shrink-0 items-center justify-center self-end rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent-hover lg:self-auto"
          >
            
            {t("شاهد البث المباشر")}
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-3.5 lg:flex-row lg:items-center lg:gap-4" aria-live="polite">
      <div className="flex min-w-0 flex-1 items-start gap-3 lg:items-center lg:gap-4">
        <MosqueIcon className="h-8 w-8 shrink-0 text-gold lg:h-9 lg:w-9" />
        <span className="flex min-w-0 flex-col gap-0.5 lg:gap-1">
          <span className="text-xs text-gold-soft lg:text-[13px]">{t("الإمامة القادمة في المسجد الحرام")}</span>
          {now === null ? (
            <span aria-hidden className="my-1 h-4 w-52 max-w-full animate-pulse rounded bg-fg/10" />
          ) : slot ? (
            <>
              <span className="font-semibold leading-6 lg:text-[17px]">
                {prayerTitle(slot.prayer)}{t("،")} {slot.nightOf ? t("ليلة {d}", { d: hijriDayLabel(slot.nightOf) }) : hijriDayLabel(slot.date)}
              </span>
              {slot.part && <span className="text-sm text-gold-soft">{t(NIGHT_PART_LABELS[slot.part])}</span>}
              <span className="flex flex-wrap items-center gap-x-1.5 text-[13px] leading-6 text-muted">
                <ClockIcon className="h-3.5 w-3.5 shrink-0 text-gold" />
                <span className="text-text">{nightLabel(slot, now, l)}</span>
                {slot.weekPrayers && slot.weekPrayers.length > 1 && (
                  <span>
                    
                    {t("· يؤم هذا الأسبوع")} {slot.weekPrayers.length === 2 ? t("صلاتي") : t("صلوات")} {prayersList(slot.weekPrayers)}
                  </span>
                )}
              </span>
            </>
          ) : (
            <span className="text-sm leading-6">{t("لا توجد إمامة معلنة حاليًا، ويُعلن الجدول أسبوعيًا.")}</span>
          )}
          {now !== null && (
            <Link href="/imamate" className="relative z-10 self-start text-[13px] font-semibold text-gold underline-offset-4 hover:underline">
              
              {t("الجدول كاملًا والاشتراك في التقويم")}
            </Link>
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