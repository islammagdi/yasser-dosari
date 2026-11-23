import type { Recording } from "@/types";
import { formatDate, formatDuration, recitationsLabel, toArabicDigits } from "@/lib/format";
import { hijriMonthName } from "@/lib/categories";
import { hijriDateLabel, recSubtitle, recTitle } from "@/lib/labels";
import { surahName } from "@/lib/quran";
import { IMAMATE_PRAYER_LABELS, IMAMATE_PRAYER_LABELS_EN, hijriDayLabel, prayerTitle, prayersList, relativeDayLabel } from "@/lib/imamate";
import { dailyAmountLabel, dailyAmountLabelEn, portionLabelEn, portionRangeEn, type WirdPortion } from "@/lib/wirdJuz";
import type { ImamatePrayer } from "@/types";
import { dirOf, localizeHref, type Lang } from "./config";
import { EN } from "./en";

export * from "./config";

type Params = Record<string, string | number>;

/**
 * الترجمة: المفتاح هو النص العربي نفسه، فالكود بيفضل مقروء بالعربي.
 * t("المفضلة") ← "Favorites". النصوص اللي فيها أرقام: t("{n} تلاوة", { n }).
 * لو النص مالوش ترجمة، بيرجع العربي زي ما هو (وبيتسجّل في الـ console وقت التطوير).
 */
export function translate(lang: Lang, ar: string, params?: Params): string {
  let out = ar;
  if (lang === "en") {
    const en = EN[ar];
    if (en != null) out = en;
    else if (process.env.NODE_ENV === "development" && /[؀-ۿ]/.test(ar)) console.warn(`[i18n] missing: ${JSON.stringify(ar)}`);
  }
  if (params) for (const [k, v] of Object.entries(params)) out = out.split(`{${k}}`).join(String(v));
  return out;
}

/**
 * كل أدوات اللغة لصفحة واحدة. في الـ client: useL()، وفي السيرفر: makeL(params.lang).
 * الأسماء زي الدوال القديمة بالظبط، عشان الكود اللي بيستخدمها ميتغيرش.
 */
export function makeL(lang: Lang) {
  const t = (ar: string, params?: Params) => translate(lang, ar, params);
  return {
    lang,
    dir: dirOf(lang),
    en: lang === "en",
    t,
    href: (path: string) => localizeHref(path, lang),
    toArabicDigits: (n: number) => toArabicDigits(n, lang),
    formatDuration: (s?: number) => formatDuration(s, lang),
    formatDate: (iso?: string) => formatDate(iso, lang),
    recitationsLabel: (n: number) => recitationsLabel(n, lang),
    surahName: (n: number) => surahName(n, lang),
    hijriMonthName: (m: number) => hijriMonthName(m, lang),
    hijriDateLabel: (d?: number, m?: number, y?: number) => hijriDateLabel(d, m, y, lang),
    /** "سورة البقرة" / "Surah Al-Baqarah" */
    surahTitle: (n: number) => (lang === "en" ? `Surah ${surahName(n, "en")}` : `سورة ${surahName(n)}`),
    recTitle: (r: Pick<Recording, "title" | "titleEn">) => recTitle(r, lang),
    recSubtitle: (r: Pick<Recording, "subtitle" | "subtitleEn" | "category">) => recSubtitle(r, lang),
    hijriDayLabel: (iso: string) => hijriDayLabel(iso, lang),
    relativeDayLabel: (iso: string, now: Date) => relativeDayLabel(iso, now, lang),
    prayerTitle: (p: ImamatePrayer) => prayerTitle(p, lang),
    prayersList: (list: ImamatePrayer[]) => prayersList(list, lang),
    /** "الفجر" / "Fajr" */
    imamatePrayer: (p: ImamatePrayer) => (lang === "en" ? IMAMATE_PRAYER_LABELS_EN : IMAMATE_PRAYER_LABELS)[p],
    dailyAmountLabel: (days: number) => (lang === "en" ? dailyAmountLabelEn(days) : dailyAmountLabel(days)),
    portionLabel: (p: WirdPortion) => (lang === "en" ? portionLabelEn(p) : p.label),
    portionRange: (p: WirdPortion) => (lang === "en" ? portionRangeEn(p) : p.range),
    /** فاصلة القوائم: "، " أو ", " */
    comma: lang === "en" ? ", " : "، ",
    /** "الفجر والمغرب" / "Fajr and Maghrib" */
    and: (items: string[]) =>
      lang === "en"
        ? items.length <= 1
          ? items.join("")
          : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`
        : items.join(" و"),
  };
}

export type L = ReturnType<typeof makeL>;
