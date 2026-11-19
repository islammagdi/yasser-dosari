import type { Metadata } from "next";
import { ClipsFeed, type FeedClip } from "@/components/ClipsFeed";
import { recordings } from "@/lib/api";
import { surahText, type Ayah } from "@/lib/api/quranText";
import { CATEGORIES } from "@/lib/categories";
import { clipFileUrl, loadClips, sourceLabel } from "@/lib/clips";
import { surahName } from "@/lib/quran";
import { toArabicDigits } from "@/lib/format";

export const metadata: Metadata = {
  title: "مقتطفات",
  description: "مقاطع قصيرة من تلاوات الشيخ ياسر الدوسري وخطبه ودروسه.",
};

export default async function ClipsPage({ searchParams }: { searchParams: { c?: string } }) {
  const clips = await loadClips();

  // التسجيل الكامل لكل مقطع (أي قسم)، عشان زرار «اسمعه كامل»
  const linked = new Set(clips.flatMap((c) => (c.recordingId ? [c.recordingId] : [])));
  const all = linked.size ? (await Promise.all(CATEGORIES.map((c) => recordings.list({ category: c.slug })))).flat() : [];
  const byId = new Map(all.filter((r) => linked.has(r.id)).map((r) => [r.id, r]));

  // نص الآيات: سورة واحدة بتتجاب مرة واحدة حتى لو كذا مقطع منها
  const surahs = [...new Set(clips.flatMap((c) => (c.surah ? [c.surah] : [])))];
  const texts = new Map<number, Ayah[]>(
    await Promise.all(
      surahs.map(async (s): Promise<[number, Ayah[]]> => {
        try {
          return [s, (await surahText(s)).ayahs];
        } catch {
          return [s, []];
        }
      }),
    ),
  );

  const feed: FeedClip[] = clips.flatMap((c) => {
    const video = clipFileUrl(c.videoKey);
    if (!video) return [];
    const rec = c.recordingId ? byId.get(c.recordingId) : undefined;
    const from = c.ayahFrom ?? 1;
    const to = c.ayahTo ?? from;
    const ayahs = c.surah ? (texts.get(c.surah) ?? []).filter((a) => a.n >= from && a.n <= to) : [];
    return [
      {
        id: c.id,
        title: c.title,
        description: c.description,
        video,
        poster: clipFileUrl(c.posterKey),
        sourceUrl: c.sourceUrl,
        sourceLabel: sourceLabel(c),
        full: rec ? { href: `/${rec.category}/${rec.id}`, title: rec.title } : undefined,
        ayah: ayahs.length
          ? {
              text: ayahs.map((a) => `${a.text} ﴿${toArabicDigits(a.n)}﴾`).join(" "),
              ref: `${surahName(c.surah!)} ${from === to ? toArabicDigits(from) : `${toArabicDigits(from)}–${toArabicDigits(to)}`}`,
              href: `/quran/${c.surah}#ayah-${from}`,
            }
          : undefined,
      },
    ];
  });

  return <ClipsFeed clips={feed} startId={searchParams.c} />;
}
