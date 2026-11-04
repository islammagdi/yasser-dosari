/**
 * البحث في نص القرآن: الفهرس (public/data/quran-search.json) بيتحمّل مرة واحدة أول ما الزائر يبحث.
 * المطابقة على "هيكل" الكلمة: من غير تشكيل ولا ألفات ولا همزات ولا مسافات،
 * عشان "الكتاب" تلاقي "ٱلۡكِتَٰبُ" و"الصلاة" تلاقي "ٱلصَّلَوٰةَ".
 */
import { surahName } from "./quran";

export interface AyahHit {
  surah: number;
  ayah: number;
  text: string;
}

/** waw = true: الواو اللي فوقها ألف صغيرة بتتقري ألف (الصلوٰة ← الصلاة). false: بتفضل واو (السمٰوٰت) */
export function quranSkeleton(text: string, waw = false): string {
  return (waw ? text.replace(/و[\u064B-\u0652]*\u0670/g, "ا") : text)
    .replace(/\u06E7/g, "ي") // إبرٰهـۧم ← إبراهيم
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, "")
    .replace(/[اأإآٱء]/g, "")
    .replace(/ؤ/g, "و")
    .replace(/[ئى]/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, "");
}

interface Index {
  texts: string[][];
  /** لكل آية هيكلين: من غير قاعدة الواو ومعاها */
  skeletons: [string, string][][];
}

let loading: Promise<Index> | null = null;

function loadIndex(): Promise<Index> {
  loading ??= fetch("/data/quran-search.json")
    .then((r) => {
      if (!r.ok) throw new Error(`quran-search ${r.status}`);
      return r.json() as Promise<string[][]>;
    })
    .then((texts) => ({ texts, skeletons: texts.map((s) => s.map((t) => [quranSkeleton(t), quranSkeleton(t, true)] as [string, string])) }))
    .catch((e) => {
      loading = null;
      throw e;
    });
  return loading;
}

/** أقل من حرفين بعد التنظيف = مفيش بحث */
export async function searchQuran(query: string, limit = 50): Promise<{ hits: AyahHit[]; total: number }> {
  const q = quranSkeleton(query);
  if (q.length < 2) return { hits: [], total: 0 };
  const { texts, skeletons } = await loadIndex();
  const hits: AyahHit[] = [];
  let total = 0;
  skeletons.forEach((surah, si) =>
    surah.forEach(([plain, waw], ai) => {
      if (!plain.includes(q) && !waw.includes(q)) return;
      total++;
      if (hits.length < limit) hits.push({ surah: si + 1, ayah: ai + 1, text: texts[si][ai] });
    }),
  );
  return { hits, total };
}

export function ayahRef(surah: number, ayah: number): string {
  return `${surahName(surah)}: ${ayah}`;
}