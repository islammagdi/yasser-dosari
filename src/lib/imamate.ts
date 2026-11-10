import type { ImamatePrayer, ImamateSlot, ImamateWeek, NightPart, RamadanNight } from "@/types";
import { toArabicDigits } from "./format";

/** الدقايق بعد الأذان اللي الموعد بيفضل ظاهر فيها (الإقامة + الصلاة) */
export const AFTER_ADHAN_MIN = 40;

/** كل المواعيد بتوقيت مكة */
const MAKKAH_TZ = "Asia/Riyadh";

export const IMAMATE_PRAYER_LABELS: Record<ImamatePrayer, string> = {
  fajr: "الفجر",
  dhuhr: "الظهر",
  asr: "العصر",
  maghrib: "المغرب",
  isha: "العشاء",
  taraweeh: "التراويح",
  tahajjud: "التهجد",
};

/** تاريخ النهارده في مكة بصيغة "2026-11-02" */
export function makkahToday(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: MAKKAH_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function makkahTime(now: Date): string {
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

/** الصلاة قايمة دلوقتي: من وقت الأذان (start) لحد نهاية الموعد (time)، بتوقيت مكة */
export function isNowLive(slot: ImamateSlot, now: Date): boolean {
  if (!slot.start || slot.date !== makkahToday(now)) return false;
  const t = makkahTime(now);
  return t >= slot.start && (!slot.time || t < slot.time);
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

/** عدد الأيام من النهارده (بتوقيت مكة) لحد التاريخ ده. سالب لو عدّى */
export function daysFromToday(isoDate: string, now: Date): number {
  const toUtc = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  return Math.round((toUtc(isoDate) - toUtc(makkahToday(now))) / 86_400_000);
}

/** "اليوم" / "غدًا" / "بعد يومين" / "بعد ٣ أيام" / "بعد ١١ يومًا" */
export function relativeDayLabel(isoDate: string, now: Date): string {
  const days = daysFromToday(isoDate, now);
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

export function hijriOf(d: Date) {
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

export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export type PrayerTimes = Record<string, Partial<Record<ImamatePrayer, string>>>;

function plusMinutes(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const t = Math.max(0, Math.min(h * 60 + m + mins, 23 * 60 + 59));
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}
/** بداية الصلاة ووقت انتهاء ظهورها، من وقت الأذان. الفروض بتعدّي بعد ٤٠ دقيقة من الأذان */
function prayerTiming(prayer: ImamatePrayer, adhan: Partial<Record<ImamatePrayer, string>> = {}) {
  const a = adhan[prayer];
  return a ? { start: a, time: plusMinutes(a, AFTER_ADHAN_MIN) } : {};
}

/** كل أسبوع ← ٧ أيام × صلوات الشيخ فيه (الفروض) */
export function expandWeeks(weeks: ImamateWeek[], times: PrayerTimes = {}): ImamateSlot[] {
  const slots: ImamateSlot[] = [];
  for (const w of weeks) {
    const [y, m, d] = w.from.split("-").map(Number);
    const first = hijriToIso(y, m, d);
    if (!first) continue;
    for (let i = 0; i < 7; i++) {
      const date = addDays(first, i);
      for (const prayer of w.prayers) {
        slots.push({ id: `${date}-${prayer}`, date, prayer, ...prayerTiming(prayer, times[date]), weekPrayers: w.prayers });
      }
    }
  }
  return slots;
}

export const NIGHT_PART_LABELS: Record<NightPart, string> = {
  first: "التسليمات الأولى",
  last: "التسليمات الأخيرة والوتر",
};

/**
 * مواعيد تقريبية لأجزاء صلوات الليل (بتوقيت مكة):
 * - التراويح: الأولى بعد العشاء بنص ساعة، والأخيرة بعدها بحوالي ٤٥ دقيقة
 * - التهجد: بعد نص الليل، والأخيرة والوتر بتخلص قبل الفجر بحوالي ساعة
 */
function nightTiming(prayer: "taraweeh" | "tahajjud", part: NightPart, adhan: Partial<Record<ImamatePrayer, string>> = {}) {
  if (prayer === "taraweeh") {
    if (!adhan.isha) return {};
    return part === "first"
      ? { start: plusMinutes(adhan.isha, 30), time: plusMinutes(adhan.isha, 80) }
      : { start: plusMinutes(adhan.isha, 75), time: plusMinutes(adhan.isha, 135) };
  }
  if (!adhan.fajr) return {};
  return part === "first"
    ? { start: plusMinutes(adhan.fajr, -240), time: plusMinutes(adhan.fajr, -150) }
    : { start: plusMinutes(adhan.fajr, -160), time: plusMinutes(adhan.fajr, -60) };
}

/**
 * ليالي رمضان ← مواعيد. "ليلة ١١" هي مساء يوم ١٠:
 * التراويح في المساء ده، والتهجد بعد نص الليل، فتاريخه الميلادي هو يوم ١١ نفسه.
 */
export function expandRamadan(nights: RamadanNight[], times: PrayerTimes = {}): ImamateSlot[] {
  const slots: ImamateSlot[] = [];
  for (const n of nights) {
    const day = hijriToIso(n.year, 9, n.night);
    if (!day) continue;
    const date = n.prayer === "taraweeh" ? addDays(day, -1) : day;
    slots.push({
      id: `${day}-${n.prayer}-${n.part}`,
      date,
      prayer: n.prayer,
      part: n.part,
      nightOf: day,
      ramadanNight: n.night,
      ramadanYear: n.year,
      ...nightTiming(n.prayer, n.part, times[date]),
    });
  }
  return slots;
}

// ---------- رمضان ----------

/** رمضان بتقويم أم القرى (بتوقيت مكة). ولتجربة الشكل: أضف ?ramadan=1 للرابط */
export function isRamadan(now: Date): boolean {
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("ramadan")) return true;
  return hijriOf(new Date(`${makkahToday(now)}T12:00:00Z`)).m === 9;
}

export function prayersList(list: ImamatePrayer[]): string {
  return list.map((p) => IMAMATE_PRAYER_LABELS[p]).join(" و");
}