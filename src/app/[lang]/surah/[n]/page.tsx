import type { Metadata } from "next";
import Link from "@/lib/i18n/nav";
import { notFound } from "next/navigation";
import { RecordingList } from "@/components/RecordingList";
import { siteUrl } from "@/lib/site";
import { loadSurahIndex } from "@/lib/surahData";
import type { Recording } from "@/types";
import { pageL, pageMeta, type LangParams } from "@/lib/i18n/server";

export const revalidate = 21600;

// صفحات بتتبني أول ما حد يفتحها، وبعدين بتتخزن جاهزة (بدل ما تتبني من الأول مع كل زيارة)
export function generateStaticParams() {
  return [];
}

interface Props {
  params: { n: string } & LangParams;
}

function parse(s: string): number | null {
  const n = Number(s);
  return Number.isInteger(n) && n >= 1 && n <= 114 ? n : null;
}

/** المصحف الأول (الصوت قبل الفيديو)، وبعده الصلوات الأحدث الأول */
function split(items: Recording[]) {
  const mushaf = items.filter((r) => r.category === "mushaf").sort((a, b) => Number(!!a.youtubeId) - Number(!!b.youtubeId));
  const prayers = items
    .filter((r) => r.category !== "mushaf")
    .sort((a, b) => (b.addedAt ?? "").localeCompare(a.addedAt ?? ""));
  return { mushaf, prayers };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const n = parse(params.n);
  if (!n) return {};
  const l = pageL(params);
  const name = l.surahName(n);
  const { prayers } = split((await loadSurahIndex()).get(n) ?? []);
  const title = l.t("سورة {s} بصوت الشيخ ياسر الدوسري", { s: name });
  const description = prayers.length
    ? l.t("استمع إلى سورة {s} كاملة بصوت الشيخ ياسر الدوسري، و{n} تلاوة منها في صلوات المسجد الحرام.", { s: name, n: l.toArabicDigits(prayers.length) })
    : l.t("استمع إلى سورة {s} كاملة بصوت الشيخ ياسر الدوسري.", { s: name });
  return pageMeta(params, `/surah/${n}`, {
    title,
    description,
    // لازم الصورة هنا كمان: openGraph في الصفحة بيستبدل بتاع الـ layout كله
    openGraph: { title, description, url: `${siteUrl}${l.href(`/surah/${n}`)}`, images: [{ url: "/og.jpg", width: 1200, height: 630 }] },
  });
}

export default async function SurahPage({ params }: Props) {
  const n = parse(params.n);
  if (!n) notFound();
  const { t, surahName, surahTitle, toArabicDigits } = pageL(params);
  const name = surahName(n);
  const { mushaf, prayers } = split((await loadSurahIndex()).get(n) ?? []);

  return (
    <>
      <div aria-hidden className="pattern-stars page-pattern" />
      <div className="flex flex-col gap-10">
        <header className="flex flex-col gap-3">
          <Link href="/surah" className="self-start text-[15px] font-medium text-gold underline-offset-4 hover:underline">
            
            {t("السور")}
          </Link>
          <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">{surahTitle(n)}</h1>
          <p className="text-lg text-muted">{t("بصوت الشيخ ياسر الدوسري")}</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <Link
              href={`/quran/${n}`}
              className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-5 text-[15px] font-semibold text-gold-soft transition-colors hover:border-gold/50"
            >
              
              {t("اقرأ السورة")}
            </Link>
            {n > 1 && (
              <Link href={`/surah/${n - 1}`} className="inline-flex min-h-11 items-center rounded-full px-4 text-[15px] text-muted hover:text-text">
                
                {t("السورة السابقة:")} {surahName(n - 1)}
              </Link>
            )}
            {n < 114 && (
              <Link href={`/surah/${n + 1}`} className="inline-flex min-h-11 items-center rounded-full px-4 text-[15px] text-muted hover:text-text">
                
                {t("السورة التالية:")} {surahName(n + 1)}
              </Link>
            )}
          </div>
        </header>

        {mushaf.length > 0 && (
          <section aria-labelledby="mushaf-title" className="flex flex-col gap-4">
            <h2 id="mushaf-title" className="px-1 font-display text-2xl font-bold text-gold-soft">
              
              {t("التلاوة الكاملة من المصحف")}
            </h2>
            <RecordingList items={mushaf} />
          </section>
        )}

        <section aria-labelledby="prayers-title" className="flex flex-col gap-4">
          <h2 id="prayers-title" className="px-1 font-display text-2xl font-bold text-gold-soft">
            
            {t("في صلوات المسجد الحرام")}
            {prayers.length > 0 && <span className="ms-2 text-base font-normal text-muted">({toArabicDigits(prayers.length)})</span>}
          </h2>
          {prayers.length > 0 ? (
            <RecordingList items={prayers} />
          ) : (
            <p className="rounded-3xl border border-dashed border-line-strong px-6 py-10 text-center text-muted">
              
              {t("لم نجد تلاوات من سورة {s} في الصلوات حتى الآن.", { s: name })}
            </p>
          )}
        </section>
      </div>
    </>
  );
}