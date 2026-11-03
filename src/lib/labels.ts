import type { Recording } from "@/types";
import { PRAYER_LABELS, hijriMonthName } from "./categories";
import { toArabicDigits } from "./format";

/** "١٤ رمضان ١٤٤٦ هـ" — اليوم والشهر اختياريين */
export function hijriDateLabel(day?: number, month?: number, year?: number): string {
  if (!year) return "";
  return [day ? toArabicDigits(day) : "", month ? hijriMonthName(month) : "", `${toArabicDigits(year)} هـ`]
    .filter(Boolean)
    .join(" ");
}

/**
 * عنوان الفروض والتراويح بيتبني من بيانات التسجيل نفسها، عشان يبقى موحّد في كل الموقع:
 *   فرض:    "صلاة العشاء، ١٤ رمضان ١٤٤٦ هـ"
 *   تراويح: "ليلة ١ رمضان ١٤٤٥ هـ"
 * باقي الأقسام بتفضل بالعنوان اللي جاي من البيانات.
 */
export function normalizeRecording(r: Recording): Recording {
  if (r.category === "fard" && r.prayer) {
    const date = hijriDateLabel(r.hijriDay, r.hijriMonth, r.hijriYear);
    return { ...r, title: `صلاة ${PRAYER_LABELS[r.prayer]}${date ? `، ${date}` : ""}` };
  }
  if (r.category === "taraweeh" && r.night) {
    const year = r.hijriYear ? ` ${toArabicDigits(r.hijriYear)} هـ` : "";
    return { ...r, title: `ليلة ${toArabicDigits(r.night)} رمضان${year}` };
  }
  if (r.category === "lectures" && r.lectureType === "khutbah" && !r.title) {
    const date = hijriDateLabel(r.hijriDay, r.hijriMonth, r.hijriYear);
    return { ...r, title: `خطبة الجمعة${date ? `، ${date}` : ""}` };
  }
  return r;
}