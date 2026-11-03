import { MOCK_IMAMATE } from "@/data/imamate";
import { MOCK_RECORDINGS } from "@/data/mock";
import type { RecordingsRepository } from "./repository";

export const mockRepository: RecordingsRepository = {
  async list({ category, limit }) {
    const items = MOCK_RECORDINGS.filter((r) => r.category === category);
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
