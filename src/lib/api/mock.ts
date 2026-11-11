import { IMAMATE_WEEKS, RAMADAN_NIGHTS } from "@/data/imamate";
import { loadImamateDoc } from "@/lib/admin/imamateStore";
import type { ImamateWeek, RamadanNight } from "@/types";
import { expandRamadan, expandWeeks } from "@/lib/imamate";
import { fetchImamateSheet, fetchRamadanSheet, imamateSheetEnabled, ramadanSheetEnabled } from "./imamateSheet";
import { makkahPrayerTimes } from "./prayerTimes";
import { MOCK_RECORDINGS } from "@/data/mock";
import { fetchMushaf } from "./mp3quran";
import { fetchYoutube, fetchYoutubeMushaf, youtubeEnabled } from "./youtube";
import type { RecordingsRepository } from "./repository";

/**
 * على الموقع الحقيقي (فيه مفتاح يوتيوب): لو جلب البيانات فشل، بنرمي الخطأ بدل ما نعرض بيانات تجريبية.
 * Next.js وقتها بيفضل يعرض آخر نسخة سليمة من الصفحة، ويحاول تاني بعدين.
 * البيانات التجريبية للتجربة على الجهاز من غير مفاتيح بس.
 */
const strict = () => youtubeEnabled();

export const mockRepository: RecordingsRepository = {
  async list({ category, limit }) {
    let items = MOCK_RECORDINGS.filter((r) => r.category === category);
    // المصحف حقيقي من mp3quran.net، ولو الطلب فشل نرجع للبيانات التجريبية
    if (category === "mushaf") {
      try {
        const real = await fetchMushaf();
        if (real.length) items = real;
      } catch (err) {
        if (strict()) throw err;
        console.warn("mp3quran: fallback to mock mushaf", err);
      }
      // نسخة تانية: المصحف المرتل من إنتاج المركز السعودي (فيديو يوتيوب)
      if (youtubeEnabled()) {
        try {
          items = [...items, ...(await fetchYoutubeMushaf())];
        } catch (err) {
          console.warn("youtube: mushaf playlist unavailable", err);
        }
      }
    }
    // الفروض والتراويح والخطب من يوتيوب لو فيه YOUTUBE_API_KEY
    if (category !== "mushaf" && youtubeEnabled()) {
      // على الموقع الحقيقي بناخد النتيجة حتى لو فاضية (قسم لسه ملوش تسجيلات)، ولو فشلت بنرمي الخطأ
      items = await fetchYoutube(category);
    }
    return typeof limit === "number" ? items.slice(0, limit) : items;
  },
  async get(id) {
    return MOCK_RECORDINGS.find((r) => r.id === id) ?? null;
  },
  async recent(limit) {
    if (youtubeEnabled()) {
      try {
        const [fard, taraweeh] = await Promise.all([fetchYoutube("fard"), fetchYoutube("taraweeh")]);
        const latest = [...fard, ...taraweeh]
          .sort((a, b) => (b.addedAt ?? "").localeCompare(a.addedAt ?? ""))
          .slice(0, limit);
        return latest;
      } catch (err) {
        if (strict()) throw err;
        console.warn("youtube: fallback to mock recent", err);
      }
    }
    return MOCK_RECORDINGS.filter((r) => r.addedAt)
      .sort((a, b) => (b.addedAt ?? "").localeCompare(a.addedAt ?? ""))
      .slice(0, limit);
  },
  async imamate() {
    // الأولوية: لوحة التحكم (R2) ← Google Sheet ← src/data/imamate.ts
    const doc = await loadImamateDoc();
    const fallback = doc ? null : await imamateFallback();
    const weeks = doc?.weeks ?? fallback!.weeks;
    const nights = doc?.ramadan ?? fallback!.nights;
    const build = (times?: Parameters<typeof expandWeeks>[1]) => [...expandWeeks(weeks, times), ...expandRamadan(nights, times)];
    const slots = build();
    // مواقيت الصلاة، عشان الموعد يعدّي بعد الصلاة نفسها مش بنهاية اليوم
    try {
      const times = await makkahPrayerTimes([...new Set(slots.map((s) => s.date))]);
      return build(times);
    } catch (err) {
      console.warn("aladhan: prayer times unavailable", err);
      return slots;
    }
  },
};

/** الجدول القديم (الشيت أو الكود): بيتستخدم لحد ما يتحفظ أول جدول من لوحة التحكم */
export async function imamateFallback(): Promise<{ weeks: ImamateWeek[]; nights: RamadanNight[] }> {
  let weeks = IMAMATE_WEEKS;
  if (imamateSheetEnabled()) {
    try {
      weeks = await fetchImamateSheet();
    } catch (err) {
      console.warn("imamate sheet: fallback to code", err);
    }
  }
  let nights = RAMADAN_NIGHTS;
  if (ramadanSheetEnabled()) {
    try {
      nights = await fetchRamadanSheet();
    } catch (err) {
      console.warn("ramadan sheet: fallback to code", err);
    }
  }
  return { weeks, nights };
}
