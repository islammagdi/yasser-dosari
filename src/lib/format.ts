import type { Lang } from "@/lib/i18n/config";

const arDigits = new Intl.NumberFormat("ar-EG", { useGrouping: false });

/** الأرقام بلغة الصفحة: "١٤" في العربي و"14" في الإنجليزي */
export function toArabicDigits(n: number, lang: Lang = "ar"): string {
  return lang === "en" ? String(n) : arDigits.format(n);
}

/** 3725 → "١:٠٢:٠٥" */
export function formatDuration(totalSec?: number, lang: Lang = "ar"): string {
  if (totalSec == null || !Number.isFinite(totalSec) || totalSec < 0) return "";
  const s = Math.floor(totalSec % 60);
  const m = Math.floor((totalSec / 60) % 60);
  const h = Math.floor(totalSec / 3600);
  const d = (v: number) => toArabicDigits(v, lang);
  const pad = (v: number) => d(v).padStart(2, lang === "en" ? "0" : "٠");
  return h > 0 ? `${d(h)}:${pad(m)}:${pad(s)}` : `${d(m)}:${pad(s)}`;
}

export function formatDate(iso?: string, lang: Lang = "ar"): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "ar-EG", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

/** يشيل التشكيل والهمزات عشان البحث يبقى مرن */
export function normalizeArabic(text: string): string {
  return text
    .replace(/[\u064B-\u0652\u0670]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    // الأرقام العربية ← إنجليزي، عشان "14" تلاقي "١٤"
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .toLowerCase()
    .trim();
}

/** "تلاوة واحدة"، "تلاوتين"، "٥ تلاوات"، "١٢ تلاوة" */
export function recitationsLabel(n: number, lang: Lang = "ar"): string {
  if (lang === "en") return n === 1 ? "1 recitation" : `${n} recitations`;
  if (n === 1) return "تلاوة واحدة";
  if (n === 2) return "تلاوتين";
  return `${toArabicDigits(n)} ${n >= 3 && n <= 10 ? "تلاوات" : "تلاوة"}`;
}
