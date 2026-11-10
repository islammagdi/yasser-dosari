import { NextResponse } from "next/server";
import { surahText, surahTimings } from "@/lib/api/quranText";

const MONTH = 60 * 60 * 24 * 30;

/**
 * نص السورة وتوقيت آياتها في تلاوة الشيخ (mp3quran)، لوضع الاستماع بملء الشاشة.
 * بيتخزن شهر، لأن النص والتوقيت مبيتغيروش.
 */
export async function GET(_req: Request, { params }: { params: { surah: string } }) {
  const n = Number(params.surah);
  if (!Number.isInteger(n) || n < 1 || n > 114) {
    return NextResponse.json({ error: "invalid surah" }, { status: 400 });
  }
  try {
    const [text, timings] = await Promise.all([surahText(n), surahTimings(n).catch(() => [])]);
    return NextResponse.json(
      { ayahs: text.ayahs, timings },
      { headers: { "Cache-Control": `public, s-maxage=${MONTH}, stale-while-revalidate=${MONTH}` } },
    );
  } catch (e) {
    console.error("ayahs:", e);
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
