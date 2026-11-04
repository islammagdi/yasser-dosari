import { NextResponse } from "next/server";

const MONTH = 60 * 60 * 24 * 30;

/**
 * التفسير الميسر (مجمع الملك فهد) لسورة كاملة من alquran.cloud: مصفوفة، عنصر لكل آية.
 * بيتخزن شهر على السيرفر وفي الـ CDN، فالـ API الخارجي بيتنده مرة لكل سورة تقريبًا.
 */
export async function GET(_req: Request, { params }: { params: { surah: string } }) {
  const n = Number(params.surah);
  if (!Number.isInteger(n) || n < 1 || n > 114) {
    return NextResponse.json({ error: "invalid surah" }, { status: 400 });
  }
  try {
    const res = await fetch(`https://api.alquran.cloud/v1/surah/${n}/ar.muyassar`, { next: { revalidate: MONTH } });
    if (!res.ok) throw new Error(`alquran.cloud ${res.status}`);
    const { data } = (await res.json()) as { data: { ayahs: { numberInSurah: number; text: string }[] } };
    const tafsir = data.ayahs.sort((a, b) => a.numberInSurah - b.numberInSurah).map((a) => a.text.trim());
    return NextResponse.json(tafsir, {
      headers: { "Cache-Control": `public, s-maxage=${MONTH}, stale-while-revalidate=${MONTH}` },
    });
  } catch (e) {
    console.error("tafsir:", e);
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}