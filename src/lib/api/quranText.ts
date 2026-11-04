/**
 * نص السورة (الرسم العثماني) من alquran.cloud، وتوقيت كل آية في تسجيل الشيخ من mp3quran.
 * النص والتوقيتات مش بيتغيّروا، فبيتخزنوا شهر.
 */
const MONTH = 60 * 60 * 24 * 30;
const READ_ID = process.env.MP3QURAN_RECITER_ID ?? "92";

export interface Ayah {
  n: number;
  text: string;
}

export interface AyahTiming {
  /** رقم الآية، و0 لو فيه جزء قبل أول آية (البسملة أو الاستعاذة) */
  ayah: number;
  /** بالمللي ثانية */
  start: number;
  end: number;
}

export interface SurahText {
  /** البسملة بتتعرض لوحدها فوق السورة (ماعدا الفاتحة والتوبة) */
  basmala: boolean;
  ayahs: Ayah[];
}

export async function surahText(surah: number): Promise<SurahText> {
  const res = await fetch(`https://api.alquran.cloud/v1/surah/${surah}/quran-uthmani`, { next: { revalidate: MONTH } });
  if (!res.ok) throw new Error(`alquran.cloud ${res.status}`);
  const { data } = (await res.json()) as { data: { ayahs: { numberInSurah: number; text: string }[] } };
  const ayahs = data.ayahs.map((a) => ({ n: a.numberInSurah, text: a.text.trim() }));

  // أول آية في كل سورة (ماعدا الفاتحة) بتيجي والبسملة في أولها: نفصلها
  let basmala = false;
  if (surah !== 1 && ayahs[0]?.text.startsWith("بِسْمِ")) {
    const words = ayahs[0].text.split(/\s+/);
    ayahs[0] = { ...ayahs[0], text: words.slice(4).join(" ") };
    basmala = true;
  }
  return { basmala, ayahs };
}

export async function surahTimings(surah: number): Promise<AyahTiming[]> {
  const res = await fetch(`https://www.mp3quran.net/api/v3/ayat_timing?surah=${surah}&read=${READ_ID}`, {
    next: { revalidate: MONTH },
  });
  if (!res.ok) throw new Error(`ayat_timing ${res.status}`);
  const raw = (await res.json()) as Record<string, unknown>[];
  return raw
    .map((t) => ({
      ayah: Number(t.ayah),
      start: Number(t.start_time ?? t.start),
      end: Number(t.end_time ?? t.end),
    }))
    .filter((t) => Number.isFinite(t.ayah) && Number.isFinite(t.start) && Number.isFinite(t.end) && t.end > t.start);
}