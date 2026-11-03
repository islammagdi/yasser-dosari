import { normalizeRecording } from "@/lib/labels";
import { createHttpRepository } from "./http";
import { mockRepository } from "./mock";
import type { RecordingsRepository } from "./repository";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const source: RecordingsRepository = apiUrl ? createHttpRepository(apiUrl) : mockRepository;

/** أي بيانات طالعة للموقع بتعدّي على normalizeRecording، سواء جاية من الـ mock أو الـ backend */
export const recordings: RecordingsRepository = {
  async list(params) {
    return (await source.list(params)).map(normalizeRecording);
  },
  async get(id) {
    const r = await source.get(id);
    return r ? normalizeRecording(r) : null;
  },
  async recent(limit) {
    return (await source.recent(limit)).map(normalizeRecording);
  },
  imamate() {
    return source.imamate();
  },
};

export type { RecordingsRepository };