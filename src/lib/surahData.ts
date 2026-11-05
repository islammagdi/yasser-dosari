import { recordings } from "@/lib/api";
import { CATEGORIES } from "@/lib/categories";
import { buildSurahIndex } from "@/lib/surahIndex";
import type { Recording } from "@/types";

/** كل التسجيلات من الأقسام كلها، مفهرسة بالسورة. لو قسم وقع، الباقي بيكمّل */
export async function loadSurahIndex(): Promise<Map<number, Recording[]>> {
  const lists = await Promise.all(CATEGORIES.map((c) => recordings.list({ category: c.slug }).catch(() => [])));
  return buildSurahIndex(lists.flat());
}