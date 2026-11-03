import type { ImamateSlot, Recording } from "@/types";
import type { RecordingsRepository } from "./repository";

/**
 * Implementation جاهز للـ backend. الـ endpoints المتوقعة:
 *   GET {base}/recordings?category=lectures&limit=3  → Recording[]
 *   GET {base}/recordings/:id                         → Recording | 404
 * غيّر المسارات هنا لو الـ backend اتعمل بشكل مختلف.
 */
export function createHttpRepository(baseUrl: string): RecordingsRepository {
  const base = baseUrl.replace(/\/$/, "");

  async function request<T>(path: string): Promise<T | null> {
    const res = await fetch(`${base}${path}`, { next: { revalidate: 300 } });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`API ${res.status} on ${path}`);
    return (await res.json()) as T;
  }

  return {
    async list({ category, limit }) {
      const q = new URLSearchParams({ category });
      if (limit) q.set("limit", String(limit));
      return (await request<Recording[]>(`/recordings?${q}`)) ?? [];
    },
    async get(id) {
      return request<Recording>(`/recordings/${encodeURIComponent(id)}`);
    },
    // GET {base}/recordings/recent?limit=4 → Recording[] مترتبة بـ addedAt من الأحدث
    async recent(limit) {
      return (await request<Recording[]>(`/recordings/recent?limit=${limit}`)) ?? [];
    },
    // GET {base}/imamate → ImamateSlot[] (المواعيد المعلنة)
    async imamate() {
      return (await request<ImamateSlot[]>("/imamate")) ?? [];
    },
  };
}
