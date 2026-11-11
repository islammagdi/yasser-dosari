import type { ImamatePrayer } from "@/types";
import { hijriDayLabel, hijriToIso } from "@/lib/imamate";

export const WEEK_PRAYERS: ImamatePrayer[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
export const MONTHS = ["محرم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"];
export const pad = (n: number) => String(n).padStart(2, "0");

/** "1448-06-07" ← ميلادي، أو null */
export function hijriIso(hijri: string): string | null {
  const [y, m, d] = hijri.split("-").map(Number);
  return hijriToIso(y, m, d);
}

/** "الجمعة، ٧ جمادى الآخرة ١٤٤٨ هـ" من تاريخ هجري */
export function labelOf(hijri: string): string {
  const iso = hijriIso(hijri);
  return iso ? hijriDayLabel(iso) : hijri;
}

/** "٧ جمادى الآخرة" بس، من غير اليوم والسنة */
export function shortLabel(hijri: string): string {
  const [, m, d] = hijri.split("-").map(Number);
  return `${d.toLocaleString("ar-EG")} ${MONTHS[m - 1]}`;
}

/** رابط صفحة الإشعارات والنص مكتوب جاهز */
export function notifyLink(title: string, body: string, url = "/imamate"): string {
  return `/admin/notify?${new URLSearchParams({ title, body, url })}`;
}
