import { getJson, putJson } from "./r2";

/**
 * تلاوة اليوم: مجموعة تلاوات مختارة من اللوحة، وكل يوم واحدة منها.
 * pinned = تلاوة مثبّتة على يوم معيّن (تاريخ ميلادي بتوقيت مكة)، وبتغلب على الاختيار التلقائي.
 */
export interface DailyDoc {
  pool: string[];
  pinned: Record<string, string>;
  updatedAt: string;
}

const KEY = "admin/daily.json";
export const DAILY_TAG = "daily";

export async function loadDaily(): Promise<DailyDoc | null> {
  try {
    return await getJson<DailyDoc>(KEY, [DAILY_TAG]);
  } catch (err) {
    console.warn("daily: unavailable", err);
    return null;
  }
}

export async function saveDaily(doc: Omit<DailyDoc, "updatedAt">): Promise<void> {
  await putJson(KEY, { ...doc, updatedAt: new Date().toISOString() });
}

export { pickForDate } from "@/lib/dailyPick";
