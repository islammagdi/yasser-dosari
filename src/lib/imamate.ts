import type { ImamatePrayer, ImamateSlot } from "@/types";
import { toArabicDigits } from "./format";

/** كل المواعيد بتوقيت مكة */
const MAKKAH_TZ = "Asia/Riyadh";

export const IMAMATE_PRAYER_LABELS: Record<ImamatePrayer, string> = {
  fajr: "الفجر",
  dhuhr: "الظهر",
  asr: "العصر",
  maghrib: "المغرب",
  isha: "العشاء",
};

/** تاريخ النهارده في مكة بصيغة "2026-11-02" */
export function makkahToday(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: MAKKAH_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function makkahTime(now: Date): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: MAKKAH_TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
}

/** أقرب إمامة جاية. لو الموعد فيه وقت، بتعدّي بعد الوقت ده؛ لو مفيهوش، بتعدّي بنهاية اليوم */
export function nextSlot(slots: ImamateSlot[], now: Date): ImamateSlot | null {
  const today = makkahToday(now);
  const time = makkahTime(now);
  const upcoming = slots
    .filter((s) => s.date > today || (s.date === today && (!s.time || s.time > time)))
    .sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")));
  return upcoming[0] ?? null;
}

/** "الثلاثاء، ٢٥ جمادى الأولى ١٤٤٨ هـ" بالتقويم الهجري (أم القرى) */
export function hijriDayLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00+03:00`);
  return new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura-nu-arab", {
    timeZone: MAKKAH_TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/** "اليوم" / "غدًا" / "بعد يومين" / "بعد ٣ أيام" / "بعد ١١ يومًا" */
export function relativeDayLabel(isoDate: string, now: Date): string {
  const toUtc = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  const days = Math.round((toUtc(isoDate) - toUtc(makkahToday(now))) / 86_400_000);
  if (days <= 0) return "اليوم";
  if (days === 1) return "غدًا";
  if (days === 2) return "بعد يومين";
  return `بعد ${toArabicDigits(days)} ${days <= 10 ? "أيام" : "يومًا"}`;
}