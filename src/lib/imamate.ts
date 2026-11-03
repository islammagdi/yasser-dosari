import type { ImamatePrayer, ImamateSlot, ImamateWeek } from "@/types";
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

// ---------- تحويل الهجري للميلادي (أم القرى) ----------

const umalqura = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", {
  timeZone: "UTC",
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

function hijriOf(d: Date) {
  const p = Object.fromEntries(umalqura.formatToParts(d).map((x) => [x.type, x.value]));
  return { y: parseInt(p.year, 10), m: Number(p.month), d: Number(p.day) };
}

/** "1448-05-14" هجري ← "2026-10-25" ميلادي. تقريب حسابي، وبعدين مطابقة دقيقة مع تقويم أم القرى */
export function hijriToIso(y: number, m: number, d: number): string | null {
  const jd = d + Math.ceil(29.5 * (m - 1)) + (y - 1) * 354 + Math.floor((3 + 11 * y) / 30) + 1948439.5 - 1;
  const approx = (jd - 2440587.5) * 86_400_000;
  for (let off = -5; off <= 5; off++) {
    const t = new Date(approx + off * 86_400_000);
    const h = hijriOf(t);
    if (h.y === y && h.m === m && h.d === d) return t.toISOString().slice(0, 10);
  }
  return null;
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export type PrayerTimes = Record<string, Partial<Record<ImamatePrayer, string>>>;

/** كل أسبوع ← ٧ أيام × صلوات الشيخ فيه */
export function expandWeeks(weeks: ImamateWeek[], times: PrayerTimes = {}): ImamateSlot[] {
  const slots: ImamateSlot[] = [];
  for (const w of weeks) {
    const [y, m, d] = w.from.split("-").map(Number);
    const start = hijriToIso(y, m, d);
    if (!start) continue;
    for (let i = 0; i < 7; i++) {
      const date = addDays(start, i);
      for (const prayer of w.prayers) {
        slots.push({ id: `${date}-${prayer}`, date, prayer, time: times[date]?.[prayer], weekPrayers: w.prayers });
      }
    }
  }
  return slots;
}

export function prayersList(list: ImamatePrayer[]): string {
  return list.map((p) => IMAMATE_PRAYER_LABELS[p]).join(" و");
}