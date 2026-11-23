import type { Recording } from "@/types";
import type { Lang } from "@/lib/i18n/config";
import { PRAYER_LABELS, PRAYER_LABELS_EN, hijriMonthName } from "./categories";
import { toArabicDigits } from "./format";
import { surahName } from "./quran";
import { surahsMentioned } from "./surahIndex";

/** "١٤ رمضان ١٤٤٦ هـ" / "14 Ramadan 1446 AH" — اليوم والشهر اختياريين */
export function hijriDateLabel(day?: number, month?: number, year?: number, lang: Lang = "ar"): string {
  if (!year) return "";
  return [day ? toArabicDigits(day, lang) : "", month ? hijriMonthName(month, lang) : "", lang === "en" ? `${year} AH` : `${toArabicDigits(year)} هـ`]
    .filter(Boolean)
    .join(" ");
}

/** اسم الصلاة بالإنجليزي من الاسم العربي المكتوب: "صلاتا المغرب والعشاء" ← "Maghrib & Isha Prayers" */
function prayerLabelEn(r: Recording): string {
  if (!r.prayerLabel) return `${PRAYER_LABELS_EN[r.prayer!]} Prayer`;
  const found = (["fajr", "maghrib", "isha"] as const).filter((p) => r.prayerLabel!.includes(PRAYER_LABELS[p]));
  if (found.length === 0) return r.prayer ? `${PRAYER_LABELS_EN[r.prayer]} Prayer` : "Prayer";
  return `${found.map((p) => PRAYER_LABELS_EN[p]).join(" & ")} Prayer${found.length > 1 ? "s" : ""}`;
}

/** العنوان والسطر الوصفي بلغة الصفحة. الإنجليزي بيرجع للعربي لو مفيش ترجمة (محاضرات بعنوان حر مثلًا) */
export function recTitle(r: Pick<Recording, "title" | "titleEn">, lang: Lang): string {
  return lang === "en" ? r.titleEn ?? r.title : r.title;
}
export function recSubtitle(r: Pick<Recording, "subtitle" | "subtitleEn" | "category">, lang: Lang): string | undefined {
  if (lang === "ar") return r.subtitle;
  if (r.subtitleEn) return r.subtitleEn;
  // الوصف العربي الحر بيفضل في المحاضرات والنادرة بس، وفي الفروض والتراويح بنخفيه
  return r.category === "lectures" || r.category === "rare" ? r.subtitle : undefined;
}

/**
 * عنوان الفروض والتراويح بيتبني من بيانات التسجيل نفسها، عشان يبقى موحّد في كل الموقع:
 *   فرض:    "صلاة العشاء، ١٤ رمضان ١٤٤٦ هـ"
 *   تراويح: "ليلة ١ رمضان ١٤٤٥ هـ"
 * باقي الأقسام بتفضل بالعنوان اللي جاي من البيانات.
 * ومعاهم titleEn و subtitleEn للنسخة الإنجليزي.
 */
export function normalizeRecording(r: Recording): Recording {
  const out = withEnglish(r);
  if (r.category === "fard" && (r.prayerLabel || r.prayer)) {
    const date = hijriDateLabel(r.hijriDay, r.hijriMonth, r.hijriYear);
    const label = r.prayerLabel ?? `صلاة ${PRAYER_LABELS[r.prayer!]}`;
    const dateEn = hijriDateLabel(r.hijriDay, r.hijriMonth, r.hijriYear, "en");
    return { ...out, title: `${label}${date ? `، ${date}` : ""}`, titleEn: `${prayerLabelEn(r)}${dateEn ? `, ${dateEn}` : ""}` };
  }
  if (r.category === "taraweeh" && r.night) {
    const year = r.hijriYear ? ` ${toArabicDigits(r.hijriYear)} هـ` : "";
    return { ...out, title: `ليلة ${toArabicDigits(r.night)} رمضان${year}`, titleEn: `Night ${r.night} of Ramadan${r.hijriYear ? ` ${r.hijriYear} AH` : ""}` };
  }
  if (r.category === "lectures" && r.lectureType === "khutbah" && !r.title) {
    const date = hijriDateLabel(r.hijriDay, r.hijriMonth, r.hijriYear);
    const dateEn = hijriDateLabel(r.hijriDay, r.hijriMonth, r.hijriYear, "en");
    return { ...out, title: `خطبة الجمعة${date ? `، ${date}` : ""}`, titleEn: `Friday Khutbah${dateEn ? `, ${dateEn}` : ""}` };
  }
  return out;
}

/** الحقول الإنجليزي اللي مش معتمدة على القسم */
function withEnglish(r: Recording): Recording {
  const out: Recording = { ...r };
  if (r.category === "mushaf" && r.surah && !r.titleEn) out.titleEn = `Surah ${surahName(r.surah, "en")}`;
  if (!r.subtitleEn) {
    const surahs = surahsMentioned(r).slice(0, 4);
    if (r.category === "mushaf") out.subtitleEn = undefined;
    else if (surahs.length) out.subtitleEn = `Surah${surahs.length > 1 ? "s" : ""} ${surahs.slice(0, 4).map((n) => surahName(n, "en")).join(", ")}`;
    else if (r.hijriYear && (r.category === "fard" || r.category === "taraweeh")) out.subtitleEn = undefined;
  }
  return out;
}

/** التسجيل يتشغّل؟ صوت مباشر أو فيديو يوتيوب */
export function isPlayable(r: Recording): boolean {
  return Boolean(r.audioUrl || r.youtubeId);
}