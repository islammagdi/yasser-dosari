import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Recording } from "@/types";
import { AyahFollow } from "@/components/AyahFollow";
import { RecordingDetail } from "@/components/RecordingDetail";
import { surahText, surahTimings, type AyahTiming, type SurahText } from "@/lib/api/quranText";
import { RecordingList } from "@/components/RecordingList";
import { listRecordings } from "@/lib/cachedData";
import { getCategory, type CategoryInfo } from "@/lib/categories";
import { siteUrl } from "@/lib/site";
import { pageL, pageMeta, type LangParams } from "@/lib/i18n/server";
import type { L } from "@/lib/i18n";

interface Props {
  params: { category: string; id: string } & LangParams;
}

/** الصفحة بتتبني أول ما حد يفتحها، وبتتخزن ٦ ساعات */
export const revalidate = 21600;

// صفحات بتتبني أول ما حد يفتحها، وبعدين بتتخزن جاهزة (بدل ما تتبني من الأول مع كل زيارة)
export function generateStaticParams() {
  return [];
}

async function load(params: Props["params"]) {
  const category = getCategory(params.category);
  if (!category) return null;
  const all = await listRecordings({ category: category.slug });
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
function structuredData(r: Recording, category: CategoryInfo, description: string, l: L) {
  const url = `${siteUrl}${l.href(`/${r.category}/${encodeURIComponent(r.id)}`)}`;
  const common = {
    name: l.recTitle(r),
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
      { "@type": "ListItem", position: 1, name: l.t("الرئيسية"), item: `${siteUrl}${l.href("/")}` },
      { "@type": "ListItem", position: 2, name: l.t(category.title), item: `${siteUrl}${l.href(`/${category.slug}`)}` },
      { "@type": "ListItem", position: 3, name: l.recTitle(r), item: url },
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
  const l = pageL(params);
  const description = describe(r, category, l);
  const title = l.recTitle(r);
  // الرابط الأساسي من غير ?t= وغيره، عشان روابط "شارك من الدقيقة" متتحسبش صفحات مكررة
  return pageMeta(params, `/${r.category}/${encodeURIComponent(r.id)}`, {
    title,
    description,
    // الصورة نفسها بتتولد من opengraph-image.tsx اللي جنب الصفحة
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  });
}

/** وصف الصفحة: السطر الوصفي + "الفروض بصوت الشيخ ياسر الدوسري" */
function describe(r: Recording, category: CategoryInfo, l: L): string {
  return [l.recSubtitle(r), l.t("{x} بصوت الشيخ ياسر الدوسري", { x: l.t(category.title) })].filter(Boolean).join(l.comma);
}

export default async function RecordingPage({ params }: Props) {
  const data = await load(params);
  if (!data) notFound();
  const { recording, all, category } = data;
  const more = related(recording, all);
  const l = pageL(params);
  const description = describe(recording, category, l);

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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData(recording, category, description, l) }} />
      <div aria-hidden className="pattern-stars page-pattern" />
      <div className="flex flex-col gap-14">
        <RecordingDetail recording={recording} queue={[recording, ...more]} />
        {text && (
          <AyahFollow
            recording={recording}
            ayahs={text.ayahs}
            basmala={text.basmala}
            timings={timings}
          />
        )}
        {more.length > 0 && (
          <section aria-labelledby="more-title" className="flex flex-col gap-4">
            <div className="flex items-center gap-4 px-1">
              <h2 id="more-title" className="font-display text-2xl font-bold text-gold-soft">
                {l.t("من {x} أيضًا", { x: l.t(category.title) })}
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