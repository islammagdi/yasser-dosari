import type { Recording } from "@/types";
import { normalizeArabic } from "./format";
import { SURAH_NAMES } from "./quran";

/**
 * بيعرف التسجيل فيه أنهي سور، من الوصف المكتوب على يوتيوب:
 * "من سورة الزخرف"، "لأواخر سورة يس"، "من سورتي الحج والفتح".
 * بندوّر بس بعد كلمة "سورة/سورتي/سور"، عشان "صلاة الفجر" متتحسبش سورة الفجر.
 */

// الأطول الأول، عشان "الحجرات" متتقريش "الحج"
const NAMES = SURAH_NAMES.map((name, i) => ({ n: i + 1, key: normalizeArabic(name) })).sort(
  (a, b) => b.key.length - a.key.length,
);
// بعد التطبيع "سورة" بتبقى "سوره"
const MARKER = /(?:^|[^\u0600-\u06FF])(سوره|سورتي|سورتا|سور)\s+/g;
const BOUNDARY = /^($|[^\u0600-\u06FF])/;

function nameAt(text: string): { n: number; len: number } | null {
  for (const { n, key } of NAMES) {
    if (text.startsWith(key) && BOUNDARY.test(text.slice(key.length))) return { n, len: key.length };
  }
  return null;
}

export function surahsMentioned(r: Recording): number[] {
  const found = new Set<number>();
  if (r.category === "mushaf" && r.surah) found.add(r.surah);

  const text = normalizeArabic(`${r.title} ${r.subtitle ?? ""} ${r.searchText ?? ""}`);
  for (const m of text.matchAll(MARKER)) {
    let rest = text.slice((m.index ?? 0) + m[0].length);
    // ممكن أكتر من اسم بينهم "و": "سورتي الحج والفتح"، "سورة ق والذاريات"
    for (let i = 0; i < 4; i++) {
      const hit = nameAt(rest);
      if (!hit) break;
      found.add(hit.n);
      rest = rest.slice(hit.len).trimStart();
      if (!rest.startsWith("و")) break;
      rest = rest.slice(1).trimStart();
    }
  }
  return [...found].sort((a, b) => a - b);
}

/** فهرس: رقم السورة ← التسجيلات اللي فيها */
export function buildSurahIndex(items: Recording[]): Map<number, Recording[]> {
  const index = new Map<number, Recording[]>();
  for (const r of items) {
    for (const n of surahsMentioned(r)) {
      const list = index.get(n);
      if (list) list.push(r);
      else index.set(n, [r]);
    }
  }
  return index;
}