import type { Recording } from "@/types";
import { normalizeArabic } from "@/lib/format";
import { surahName } from "@/lib/quran";

/**
 * المصحف المسجل من mp3quran.net (API عام ومجاني)
 * التوثيق: https://www.mp3quran.net/eng/api
 */
const API = "https://www.mp3quran.net/api/v3";
const RECITER_NAME = "ياسر الدوسري";
/** اختياري: لو عرفت رقم القارئ عندهم حطه في MP3QURAN_RECITER_ID، الطلب هيبقى أخف بكتير */
const RECITER_ID = process.env.MP3QURAN_RECITER_ID;
/** البيانات بتتحدّث مرة في اليوم */
const REVALIDATE = 60 * 60 * 24;

interface Mp3QuranMoshaf {
  id: number;
  name: string;
  server: string;
  surah_total: number;
  surah_list: string;
}

interface Mp3QuranReciter {
  id: number;
  name: string;
  moshaf: Mp3QuranMoshaf[];
}

async function findReciter(): Promise<Mp3QuranReciter | null> {
  const url = RECITER_ID ? `${API}/reciters?language=ar&reciter=${RECITER_ID}` : `${API}/reciters?language=ar`;
  const res = await fetch(url, { next: { revalidate: REVALIDATE } });
  if (!res.ok) throw new Error(`mp3quran ${res.status}`);
  const data = (await res.json()) as { reciters?: Mp3QuranReciter[] };
  const target = normalizeArabic(RECITER_NAME);
  return data.reciters?.find((r) => RECITER_ID || normalizeArabic(r.name).includes(target)) ?? null;
}

export async function fetchMushaf(): Promise<Recording[]> {
  const reciter = await findReciter();
  if (!reciter || reciter.moshaf.length === 0) return [];

  // نفضّل رواية حفص المرتّلة، وإلا أول مصحف عنده
  const moshaf =
    reciter.moshaf.find((m) => m.name.includes("حفص") && m.name.includes("مرتل")) ??
    reciter.moshaf.find((m) => m.name.includes("حفص")) ??
    reciter.moshaf[0];

  // https دايمًا، وإلا المتصفح هيمنع الصوت على موقع https (mixed content)
  const server = moshaf.server.replace(/^http:/, "https:").replace(/\/?$/, "/");

  return moshaf.surah_list
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => n >= 1 && n <= 114)
    .sort((a, b) => a - b)
    .map((n) => {
      const file = String(n).padStart(3, "0");
      return {
        id: `mushaf-${file}`,
        category: "mushaf" as const,
        surah: n,
        title: `سورة ${surahName(n)}`,
        subtitle: moshaf.name,
        audioUrl: `${server}${file}.mp3`,
      };
    });
}