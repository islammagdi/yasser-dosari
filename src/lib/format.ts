const arDigits = new Intl.NumberFormat("ar-EG", { useGrouping: false });

export function toArabicDigits(n: number): string {
  return arDigits.format(n);
}

/** 3725 → "١:٠٢:٠٥" */
export function formatDuration(totalSec?: number): string {
  if (totalSec == null || !Number.isFinite(totalSec) || totalSec < 0) return "";
  const s = Math.floor(totalSec % 60);
  const m = Math.floor((totalSec / 60) % 60);
  const h = Math.floor(totalSec / 3600);
  const pad = (v: number) => toArabicDigits(v).padStart(2, "٠");
  return h > 0 ? `${toArabicDigits(h)}:${pad(m)}:${pad(s)}` : `${toArabicDigits(m)}:${pad(s)}`;
}

export function formatDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "long", year: "numeric" }).format(d);
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
export function recitationsLabel(n: number): string {
  if (n === 1) return "تلاوة واحدة";
  if (n === 2) return "تلاوتين";
  return `${toArabicDigits(n)} ${n >= 3 && n <= 10 ? "تلاوات" : "تلاوة"}`;
}
