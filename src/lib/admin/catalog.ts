import type { Category, Recording } from "@/types";
import { backupBeforeSave } from "./backup";
import { getJson, putJson } from "./r2";

/**
 * الكتالوج: كل التسجيلات اللي بتظهر في الموقع (الفروض والتراويح والخطب)، وكل واحد في قسمه.
 * بيتعدّل من لوحة التحكم، ومحفوظ على R2. المفتاح = ID فيديو يوتيوب.
 */
export type CatalogEntry = Omit<Recording, "id" | "youtubeId" | "audioUrl"> & {
  /** مخفي من الموقع، بس فاضل في الكتالوج عشان ميرجعش في "بانتظار التصنيف" */
  hidden?: boolean;
};

export interface Catalog {
  items: Record<string, CatalogEntry>;
  updatedAt: string;
}

const KEY = "admin/catalog.json";
export const CATALOG_TAG = "catalog";

export async function loadCatalog(): Promise<Catalog | null> {
  try {
    return await getJson<Catalog>(KEY, [CATALOG_TAG]);
  } catch (err) {
    console.warn("catalog: unavailable", err);
    return null;
  }
}

export async function saveCatalog(items: Record<string, CatalogEntry>): Promise<void> {
  await backupBeforeSave("catalog");
  await putJson(KEY, { items, updatedAt: new Date().toISOString() });
}

/** تسجيل من الموقع ← سطر في الكتالوج */
export function toEntry(r: Recording): [string, CatalogEntry] {
  const { id, youtubeId, audioUrl, ...rest } = r;
  void audioUrl;
  return [youtubeId ?? id.replace(/^yt-/, ""), rest];
}

/** تسجيل خاص (ملوش فيديو على يوتيوب): مفتاحه بيبدأ بـ custom- */
export const isCustomKey = (key: string) => key.startsWith("custom-");

/** سطر في الكتالوج ← تسجيل يعرضه الموقع */
export function fromEntry(key: string, e: CatalogEntry): Recording {
  const { hidden, ...rest } = e;
  void hidden;
  if (isCustomKey(key)) return { ...rest, id: key, audioUrl: "" };
  return { ...rest, id: `yt-${key}`, youtubeId: key, audioUrl: "" };
}

export function catalogRecordings(catalog: Catalog, category: Category): Recording[] {
  const list = Object.entries(catalog.items)
    .filter(([, e]) => e.category === category && !e.hidden)
    .map(([id, e]) => fromEntry(id, e));
  // التلاوات النادرة ملهاش تاريخ ثابت: الأحدث إضافة الأول
  if (category === "rare") list.sort((a, b) => (b.addedAt ?? "").localeCompare(a.addedAt ?? ""));
  return list;
}
