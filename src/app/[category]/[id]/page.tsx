import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Recording } from "@/types";
import { AyahFollow } from "@/components/AyahFollow";
import { RecordingDetail } from "@/components/RecordingDetail";
import { surahText, surahTimings, type AyahTiming, type SurahText } from "@/lib/api/quranText";
import { RecordingList } from "@/components/RecordingList";
import { recordings } from "@/lib/api";
import { CATEGORY_COVERS, getCategory } from "@/lib/categories";

interface Props {
  params: { category: string; id: string };
  searchParams: { t?: string };
}

/** الصفحة بتتبني أول ما حد يفتحها، وبتتخزن ٦ ساعات */
export const revalidate = 21600;

async function load(params: Props["params"]) {
  const category = getCategory(params.category);
  if (!category) return null;
  const all = await recordings.list({ category: category.slug });
  const id = decodeURIComponent(params.id);
  const recording = all.find((r) => r.id === id);
  return recording ? { category, all, recording } : null;
}

/** تلاوات قريبة: نفس الشهر في الفروض، نفس السنة في التراويح، السور اللي حواليها في المصحف */
function related(r: Recording, all: Recording[]): Recording[] {
  const others = all.filter((x) => x.id !== r.id && (x.versionLabel ?? "") === (r.versionLabel ?? ""));
  let list: Recording[];
  if (r.surah) list = others.filter((x) => x.surah && Math.abs(x.surah - r.surah!) <= 5).sort((a, b) => a.surah! - b.surah!);
  else if (r.category === "fard") list = others.filter((x) => x.hijriYear === r.hijriYear && x.hijriMonth === r.hijriMonth);
  else if (r.hijriYear) list = others.filter((x) => x.hijriYear === r.hijriYear);
  else list = others;
  return (list.length ? list : others).slice(0, 10);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await load(params);
  if (!data) return {};
  const { recording: r, category } = data;
  const image = r.imageUrl ?? CATEGORY_COVERS[r.category] ?? "/images/sheikh.jpg";
  const description = [r.subtitle, `${category.title} بصوت الشيخ ياسر الدوسري`].filter(Boolean).join("، ");
  return {
    title: r.title,
    description,
    openGraph: { title: r.title, description, images: [{ url: image }], type: "website" },
    twitter: { card: "summary_large_image", title: r.title, description, images: [image] },
  };
}

export default async function RecordingPage({ params, searchParams }: Props) {
  const data = await load(params);
  if (!data) notFound();
  const { recording, all, category } = data;
  const more = related(recording, all);
  const startAt = Math.max(0, Number(searchParams.t) || 0);

  // نص السورة وتوقيت الآيات: للمصحف الصوتي من mp3quran بس (التوقيت مربوط بالتسجيل ده)
  let text: SurahText | null = null;
  let timings: AyahTiming[] = [];
  if (recording.category === "mushaf" && recording.surah) {
    const [t, tm] = await Promise.allSettled([
      surahText(recording.surah),
      recording.audioUrl.includes("mp3quran") ? surahTimings(recording.surah) : Promise.resolve([]),
    ]);
    if (t.status === "fulfilled") text = t.value;
    if (tm.status === "fulfilled") timings = tm.value;
  }

  return (
    <>
      <div aria-hidden className="pattern-stars page-pattern" />
      <div className="flex flex-col gap-14">
        <RecordingDetail recording={recording} queue={[recording, ...more]} startAt={startAt} />
        {text && <AyahFollow recording={recording} ayahs={text.ayahs} basmala={text.basmala} timings={timings} />}
        {more.length > 0 && (
          <section aria-labelledby="more-title" className="flex flex-col gap-4">
            <div className="flex items-center gap-4 px-1">
              <h2 id="more-title" className="font-display text-2xl font-bold text-gold-soft">
                من {category.title} أيضًا
              </h2>
              <span aria-hidden className="h-px flex-1 bg-gradient-to-l from-gold/30 to-transparent" />
            </div>
            <RecordingList items={more} numbered={category.slug === "mushaf" || category.slug === "taraweeh"} />
          </section>
        )}
      </div>
    </>
  );
}