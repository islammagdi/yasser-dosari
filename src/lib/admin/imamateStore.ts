import type { ImamatePrayer, ImamateWeek, RamadanNight } from "@/types";
import { getJson, putJson } from "./r2";

/** جدول الإمامة ورمضان اللي بيتعدّل من لوحة التحكم، محفوظ على R2 */
export interface ImamateDoc {
  weeks: ImamateWeek[];
  ramadan: RamadanNight[];
  updatedAt: string;
}

const KEY = "admin/imamate.json";
export const IMAMATE_TAG = "imamate";

export async function loadImamateDoc(): Promise<ImamateDoc | null> {
  try {
    return await getJson<ImamateDoc>(KEY, [IMAMATE_TAG]);
  } catch (err) {
    console.warn("imamate doc: unavailable", err);
    return null;
  }
}

export async function saveImamateDoc(doc: Omit<ImamateDoc, "updatedAt">): Promise<void> {
  await putJson(KEY, { ...doc, updatedAt: new Date().toISOString() });
}

// ---------- تنظيف اللي جاي من المتصفح قبل الحفظ ----------

const WEEK_PRAYERS: ImamatePrayer[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

export function cleanWeeks(input: unknown): ImamateWeek[] {
  if (!Array.isArray(input)) return [];
  const byDate = new Map<string, ImamateWeek>();
  for (const w of input) {
    const from = typeof w?.from === "string" && /^1[34]\d{2}-\d{2}-\d{2}$/.test(w.from) ? w.from : null;
    const prayers = Array.isArray(w?.prayers) ? WEEK_PRAYERS.filter((p) => w.prayers.includes(p)) : [];
    if (from && prayers.length) byDate.set(from, { from, prayers });
  }
  return [...byDate.values()].sort((a, b) => a.from.localeCompare(b.from));
}

export function cleanNights(input: unknown): RamadanNight[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: RamadanNight[] = [];
  for (const n of input) {
    const year = Number(n?.year);
    const night = Number(n?.night);
    const prayer = n?.prayer === "taraweeh" || n?.prayer === "tahajjud" ? n.prayer : null;
    const part = n?.part === "first" || n?.part === "last" ? n.part : null;
    if (!Number.isInteger(year) || year < 1400 || !Number.isInteger(night) || night < 1 || night > 30 || !prayer || !part) continue;
    const key = `${year}-${night}-${prayer}-${part}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ year, night, prayer, part });
  }
  return out.sort((a, b) => a.year - b.year || a.night - b.night);
}
