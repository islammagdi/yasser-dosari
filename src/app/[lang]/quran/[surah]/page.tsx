import type { Metadata } from "next";
import Link from "@/lib/i18n/nav";
import { notFound } from "next/navigation";
import { QuranReader } from "@/components/QuranReader";
import { surahText, surahTranslation } from "@/lib/api/quranText";
import { langOf, pageL, pageMeta, type LangParams } from "@/lib/i18n/server";
import { juzOf } from "@/lib/quranParts";

interface Props {
  params: { surah: string } & LangParams;
}

/** النص مش بيتغيّر: الصفحة بتتبني أول ما حد يفتحها وبتتخزن شهر */
export const revalidate = 2592000;

/** مفيش صفحات بتتبني وقت الـ build، كل سورة بتتبني أول ما حد يفتحها */
export function generateStaticParams() {
  return [];
}

function parse(s: string): number | null {
  const n = Number(s);
  return Number.isInteger(n) && n >= 1 && n <= 114 ? n : null;
}

export function generateMetadata({ params }: Props): Metadata {
  const n = parse(params.surah);
  if (!n) return {};
  const { t, surahTitle } = pageL(params);
  const title = surahTitle(n);
  return pageMeta(params, `/quran/${n}`, {
    title,
    description: t("اقرأ {x} بالرسم العثماني، واستمع لها بصوت الشيخ ياسر الدوسري.", { x: title }),
  });
}

export default async function SurahReadPage({ params }: Props) {
  const n = parse(params.surah);
  if (!n) notFound();
  const { t, surahName, surahTitle, toArabicDigits } = pageL(params);
  const en = langOf(params) === "en";

  let text;
  try {
    text = await surahText(n);
  } catch {
    text = null;
  }
  // النسخة الإنجليزي: ترجمة المعاني تحت كل آية
  const translation = en ? await surahTranslation(n) : undefined;

  const nav = "glass-card flex min-h-12 flex-1 items-center gap-2 rounded-2xl px-4 text-sm transition-colors hover:bg-fg/5";

  return (
    <>
      <div aria-hidden className="pattern-stars page-pattern" />
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <nav aria-label={t("مسار الصفحة")} className="text-sm text-muted">
          <Link href="/quran" className="hover:text-text">
            
            {t("القرآن الكريم")}
          </Link>
          <span aria-hidden> / </span>
          <span>{surahTitle(n)}</span>
        </nav>

        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-gold-soft">
              
              {t("السورة {n} · الجزء {j}", { n: toArabicDigits(n), j: toArabicDigits(juzOf(n, 1)) })}
            </span>
            <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">{surahTitle(n)}</h1>
          </div>
          <Link
            href={`/mushaf/mushaf-${String(n).padStart(3, "0")}`}
            className="flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink transition-opacity hover:opacity-90"
          >
            <span aria-hidden>▶</span>
            
            {t("استمع بصوت الشيخ")}
          </Link>
        </header>

        {text ? (
          <QuranReader surah={n} ayahs={text.ayahs} basmala={text.basmala} translation={translation} />
        ) : (
          <p className="glass-card rounded-3xl px-6 py-10 text-center text-muted">
            
            {t("تعذّر تحميل نص السورة الآن. حاول مرة أخرى بعد قليل.")}
          </p>
        )}

        <div className="flex gap-3">
          {n > 1 && (
            <Link href={`/quran/${n - 1}`} className={nav}>
              <span aria-hidden className="rtl:rotate-0 ltr:rotate-180">→</span>
              <span className="flex flex-col">
                <span className="text-xs text-muted">{t("السابقة")}</span>
                <span className="font-semibold">{surahName(n - 1)}</span>
              </span>
            </Link>
          )}
          {n < 114 && (
            <Link href={`/quran/${n + 1}`} className={`${nav} justify-end text-end`}>
              <span className="flex flex-col">
                <span className="text-xs text-muted">{t("التالية")}</span>
                <span className="font-semibold">{surahName(n + 1)}</span>
              </span>
              <span aria-hidden className="rtl:rotate-0 ltr:rotate-180">←</span>
            </Link>
          )}
        </div>
      </div>
    </>
  );
}