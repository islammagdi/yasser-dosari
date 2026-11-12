import type { Recording } from "@/types";
import { surahsMentioned } from "@/lib/surahIndex";
import { SURAH_NAMES } from "@/lib/quran";
import { toArabicDigits } from "@/lib/format";

/** ملخص سورة واحدة لخريطة السور في الرئيسية (خفيف، من غير التسجيلات نفسها) */
export interface SurahStat {
  n: number;
  total: number;
  mushaf: number;
  fajr: number;
  maghrib: number;
  isha: number;
  taraweeh: number;
  other: number;
  /** عنوان آخر صلاة اتقرت فيها السورة، لو فيه */
  last?: string;
}

export interface HomeCollection {
  id: string;
  /** الكلمة الكبيرة بالرقعة على الكارت */
  word: string;
  title: string;
  tone: "emerald" | "amber" | "navy" | "maroon";
  href?: string;
  items: Recording[];
}

const MAX_ITEMS = 40;
const SHORT_SURAHS_FROM = 78; // جزء عمّ

const hijriKey = (r: Recording) => (r.hijriYear ?? 0) * 10000 + (r.hijriMonth ?? 0) * 100 + (r.hijriDay ?? 0);
const newestFirst = (a: Recording, b: Recording) => hijriKey(b) - hijriKey(a) || (b.addedAt ?? "").localeCompare(a.addedAt ?? "");

export function surahStats(index: Map<number, Recording[]>): SurahStat[] {
  return SURAH_NAMES.map((_, i) => {
    const n = i + 1;
    const list = index.get(n) ?? [];
    const s: SurahStat = { n, total: list.length, mushaf: 0, fajr: 0, maghrib: 0, isha: 0, taraweeh: 0, other: 0 };
    for (const r of list) {
      if (r.category === "mushaf") s.mushaf++;
      else if (r.category === "taraweeh") s.taraweeh++;
      else if (r.category === "fard" && r.prayer) s[r.prayer]++;
      else s.other++;
    }
    const lastPrayer = list.filter((r) => r.category === "fard" || r.category === "taraweeh").sort(newestFirst)[0];
    if (lastPrayer) s.last = lastPrayer.title;
    return s;
  });
}

/**
 * مجموعات أوتوماتيك من البيانات الموجودة، بتتحدّث لوحدها مع كل تسجيل جديد.
 * أي مجموعة فيها أقل من تسجيلين مبتظهرش.
 */
export function homeCollections(all: Recording[], index: Map<number, Recording[]>): HomeCollection[] {
  const out: HomeCollection[] = [];

  const shortFajr = all
    .filter((r) => r.category === "fard" && r.prayer === "fajr" && surahsMentioned(r).some((n) => n >= SHORT_SURAHS_FROM))
    .sort(newestFirst);
  out.push({ id: "short-fajr", word: "قِصار السور", title: "في صلاة الفجر", tone: "emerald", href: "/fard", items: shortFajr });

  const taraweeh = all.filter((r) => r.category === "taraweeh" && r.hijriYear && r.night);
  const lastYear = Math.max(0, ...taraweeh.map((r) => r.hijriYear!));
  const lastTen = taraweeh.filter((r) => r.hijriYear === lastYear && r.night! >= 21).sort((a, b) => a.night! - b.night!);
  out.push({
    id: "last-ten",
    word: "العشر الأواخر",
    title: lastYear ? `من رمضان ${toArabicDigits(lastYear)} هـ` : "من رمضان",
    tone: "navy",
    href: "/taraweeh",
    items: lastTen,
  });

  // سور بعينها: كل مرة قرأها الشيخ، المصحف الأول وبعدين الصلوات من الأحدث
  const surahSet = (n: number, tone: HomeCollection["tone"], word: string): HomeCollection => {
    const list = index.get(n) ?? [];
    const mushaf = list.filter((r) => r.category === "mushaf");
    const rest = list.filter((r) => r.category !== "mushaf").sort(newestFirst);
    return { id: `surah-${n}`, word, title: "كل مرة قرأها الشيخ", tone, href: `/surah/${n}`, items: [...mushaf, ...rest] };
  };
  out.push(surahSet(18, "amber", "سورة الكهف"));
  out.push(surahSet(67, "maroon", "سورة الملك"));

  return out
    .filter((c) => c.items.length >= 2)
    .map((c) => ({ ...c, items: c.items.slice(0, MAX_ITEMS) }));
}
