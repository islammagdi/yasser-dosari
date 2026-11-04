import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Recording } from "@/types";
import { AyahFollow } from "@/components/AyahFollow";
import { RecordingDetail } from "@/components/RecordingDetail";
import { surahText, surahTimings, type AyahTiming, type SurahText } from "@/lib/api/quranText";
import { RecordingList } from "@/components/RecordingList";
import { recordings } from "@/lib/api";
import { CATEGORY_COVERS, getCategory, type CategoryInfo } from "@/lib/categories";
import { siteUrl } from "@/lib/site";

interface Props {
  params: { category: string; id: string };
  searchParams: { t?: string; from?: string; to?: string };
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

/** المدة بصيغة ISO 8601 اللي جوجل بيفهمها: ٣٧٥ ثانية ← PT6M15S */
function isoDuration(sec?: number): string | undefined {
  if (!sec || !Number.isFinite(sec) || sec <= 0) return undefined;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return `PT${h ? `${h}H` : ""}${m ? `${m}M` : ""}${s ? `${s}S` : ""}`;
}

/**
 * بيانات منظمة (JSON-LD) بتعرّف جوجل إن الصفحة تسجيل:
 * فيديو يوتيوب ← VideoObject، ملف صوت ← AudioObject، ومعاهم مسار الصفحة (Breadcrumb).
 */
function structuredData(r: Recording, category: CategoryInfo, description: string) {
  const url = `${siteUrl}/${r.category}/${encodeURIComponent(r.id)}`;
  const common = {
    name: r.title,
    description,
    inLanguage: "ar",
    duration: isoDuration(r.durationSec),
    url,
  };

  let media: Record<string, unknown> | null = null;
  // جوجل بيطلب تاريخ رفع للفيديو، فمن غيره منحطش VideoObject
  if (r.youtubeId && r.addedAt) {
    media = {
      "@type": "VideoObject",
      ...common,
      thumbnailUrl: [r.imageUrl ?? `https://i.ytimg.com/vi/${r.youtubeId}/hqdefault.jpg`],
      uploadDate: r.addedAt,
      embedUrl: `https://www.youtube.com/embed/${r.youtubeId}`,
    };
  } else if (r.audioUrl) {
    media = {
      "@type": "AudioObject",
      ...common,
      contentUrl: r.audioUrl,
      encodingFormat: "audio/mpeg",
      ...(r.addedAt && { uploadDate: r.addedAt }),
    };
  }

  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "الرئيسية", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: category.title, item: `${siteUrl}/${category.slug}` },
      { "@type": "ListItem", position: 3, name: r.title, item: url },
    ],
  };

  const graph = { "@context": "https://schema.org", "@graph": media ? [media, breadcrumb] : [breadcrumb] };
  // < بيتحول لـ \u003c عشان أي نص في العنوان ميقدرش يقفل وسم الـ script
  return JSON.stringify(graph).replace(/</g, "\\u003c");
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
    // الرابط الأساسي من غير ?t= وغيره، عشان روابط "شارك من الدقيقة" متتحسبش صفحات مكررة
    alternates: { canonical: `/${r.category}/${encodeURIComponent(r.id)}` },
    openGraph:{ title: r.title, description, images: [{ url: image }], type: "website" },
    twitter: { card: "summary_large_image", title: r.title, description, images: [image] },
  };
}

export default async function RecordingPage({ params, searchParams }: Props) {
  const data = await load(params);
  if (!data) notFound();
  const { recording, all, category } = data;
  const more = related(recording, all);
  const startAt = Math.max(0, Number(searchParams.t) || 0);
  const description = [recording.subtitle, `${category.title} بصوت الشيخ ياسر الدوسري`].filter(Boolean).join("، ");

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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData(recording, category, description) }} />
      <div aria-hidden className="pattern-stars page-pattern" />
      <div className="flex flex-col gap-14">
        <RecordingDetail recording={recording} queue={[recording, ...more]} startAt={startAt} />
        {text && (
          <AyahFollow
            recording={recording}
            ayahs={text.ayahs}
            basmala={text.basmala}
            timings={timings}
            initialFrom={Number(searchParams.from) || undefined}
            initialTo={Number(searchParams.to) || undefined}
          />
        )}
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