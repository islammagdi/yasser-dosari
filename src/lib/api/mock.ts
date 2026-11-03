import { IMAMATE_WEEKS } from "@/data/imamate";
import { expandWeeks } from "@/lib/imamate";
import { fetchImamateSheet, imamateSheetEnabled } from "./imamateSheet";
import { makkahPrayerTimes } from "./prayerTimes";
import { MOCK_RECORDINGS } from "@/data/mock";
import { fetchMushaf } from "./mp3quran";
import { fetchYoutube, fetchYoutubeMushaf, youtubeEnabled } from "./youtube";
import type { RecordingsRepository } from "./repository";

export const mockRepository: RecordingsRepository = {
  async list({ category, limit }) {
    let items = MOCK_RECORDINGS.filter((r) => r.category === category);
    // المصحف حقيقي من mp3quran.net، ولو الطلب فشل نرجع للبيانات التجريبية
    if (category === "mushaf") {
      try {
        const real = await fetchMushaf();
        if (real.length) items = real;
      } catch (err) {
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
      try {
        const real = await fetchYoutube(category);
        if (real.length) items = real;
      } catch (err) {
        console.warn(`youtube: fallback to mock ${category}`, err);
      }
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
        if (latest.length) return latest;
      } catch (err) {
        console.warn("youtube: fallback to mock recent", err);
      }
    }
    return MOCK_RECORDINGS.filter((r) => r.addedAt)
      .sort((a, b) => (b.addedAt ?? "").localeCompare(a.addedAt ?? ""))
      .slice(0, limit);
  },
  async imamate() {
    // الجدول من Google Sheet لو متظبط، وإلا من src/data/imamate.ts
    let weeks = IMAMATE_WEEKS;
    if (imamateSheetEnabled()) {
      try {
        weeks = await fetchImamateSheet();
      } catch (err) {
        console.warn("imamate sheet: fallback to code", err);
      }
    }
    const slots = expandWeeks(weeks);
    // مواقيت الصلاة، عشان الموعد يعدّي بعد الصلاة نفسها مش بنهاية اليوم
    try {
      const times = await makkahPrayerTimes([...new Set(slots.map((s) => s.date))]);
      return expandWeeks(weeks, times);
    } catch (err) {
      console.warn("aladhan: prayer times unavailable", err);
      return slots;
    }
  },
};
