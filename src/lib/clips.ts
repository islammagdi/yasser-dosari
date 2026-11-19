import { getJson, r2Enabled } from "@/lib/admin/r2";

/**
 * «مقتطفات»: مقاطع قصيرة بتترفع من لوحة التحكم على R2 (clips/)، وبياناتها في clips.json.
 */
export interface Clip {
  id: string;
  title: string;
  description?: string;
  videoKey: string;
  posterKey?: string;
  /** رابط المقطع الأصلي (حقوق المصدر)، بيظهر تحت كل مقطع */
  sourceUrl: string;
  sourceName?: string;
  /** التسجيل الكامل اللي المقطع مقتطع منه (تلاوة أو درس أو خطبة) */
  recordingId?: string;
  surah?: number;
  ayahFrom?: number;
  ayahTo?: number;
  createdAt: string;
  hidden?: boolean;
}

export const CLIPS_KEY = "clips.json";
export const CLIPS_TAG = "clips";

const AUDIO_BASE = (process.env.AUDIO_BASE_URL ?? "").replace(/\/$/, "");

/** كل المقاطع (للأدمن): الأحدث الأول */
export async function loadAllClips(): Promise<Clip[]> {
  if (!r2Enabled()) return [];
  try {
    const list = (await getJson<Clip[]>(CLIPS_KEY, [CLIPS_TAG])) ?? [];
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

/** المقاطع الظاهرة بس (للموقع) */
export async function loadClips(): Promise<Clip[]> {
  return (await loadAllClips()).filter((c) => !c.hidden);
}

export const clipFileUrl = (key?: string) => (key && AUDIO_BASE ? `${AUDIO_BASE}/${key}` : undefined);

/** اسم المصدر للعرض: اللي اتكتب، أو الدومين من الرابط */
export function sourceLabel(c: Pick<Clip, "sourceName" | "sourceUrl">): string {
  if (c.sourceName?.trim()) return c.sourceName.trim();
  try {
    return new URL(c.sourceUrl).hostname.replace(/^www\./, "");
  } catch {
    return "المصدر";
  }
}
