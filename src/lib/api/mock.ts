import { MOCK_IMAMATE } from "@/data/imamate";
import { MOCK_RECORDINGS } from "@/data/mock";
import { fetchMushaf } from "./mp3quran";
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
    }
    return typeof limit === "number" ? items.slice(0, limit) : items;
  },
  async get(id) {
    return MOCK_RECORDINGS.find((r) => r.id === id) ?? null;
  },
  async recent(limit) {
    return MOCK_RECORDINGS.filter((r) => r.addedAt)
      .sort((a, b) => (b.addedAt ?? "").localeCompare(a.addedAt ?? ""))
      .slice(0, limit);
  },
  async imamate() {
    return MOCK_IMAMATE;
  },
};
