import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { QuranReader } from "@/components/QuranReader";
import { surahText } from "@/lib/api/quranText";
import { toArabicDigits } from "@/lib/format";
import { surahName } from "@/lib/quran";
import { juzOf } from "@/lib/quranParts";

interface Props {
  params: { surah: string };
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
  const title = `سورة ${surahName(n)}`;
  return { title, description: `اقرأ ${title} بالرسم العثماني، واستمع لها بصوت الشيخ ياسر الدوسري.` };
}

export default async function SurahReadPage({ params }: Props) {
  const n = parse(params.surah);
  if (!n) notFound();

  let text;
  try {
    text = await surahText(n);
  } catch {
    text = null;
  }

  const nav = "glass-card flex min-h-12 flex-1 items-center gap-2 rounded-2xl px-4 text-sm transition-colors hover:bg-white/5";

  return (
    <>
      <div aria-hidden className="pattern-stars page-pattern" />
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <nav aria-label="مسار الصفحة" className="text-sm text-muted">
          <Link href="/quran" className="hover:text-text">
            القرآن الكريم
          </Link>
          <span aria-hidden> / </span>
          <span>سورة {surahName(n)}</span>
        </nav>

        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-gold-soft">
              السورة {toArabicDigits(n)} · الجزء {toArabicDigits(juzOf(n, 1))}
            </span>
            <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">سورة {surahName(n)}</h1>
          </div>
          <Link
            href={`/mushaf/mushaf-${String(n).padStart(3, "0")}`}
            className="flex min-h-11 items-center gap-2 rounded-full bg-gold px-5 text-sm font-semibold text-gold-ink transition-opacity hover:opacity-90"
          >
            <span aria-hidden>▶</span>
            استمع بصوت الشيخ
          </Link>
        </header>

        {text ? (
          <QuranReader surah={n} ayahs={text.ayahs} basmala={text.basmala} />
        ) : (
          <p className="glass-card rounded-3xl px-6 py-10 text-center text-muted">
            تعذّر تحميل نص السورة الآن. حاول مرة أخرى بعد قليل.
          </p>
        )}

        <div className="flex gap-3">
          {n > 1 && (
            <Link href={`/quran/${n - 1}`} className={nav}>
              <span aria-hidden>→</span>
              <span className="flex flex-col">
                <span className="text-xs text-muted">السابقة</span>
                <span className="font-semibold">{surahName(n - 1)}</span>
              </span>
            </Link>
          )}
          {n < 114 && (
            <Link href={`/quran/${n + 1}`} className={`${nav} justify-end text-end`}>
              <span className="flex flex-col">
                <span className="text-xs text-muted">التالية</span>
                <span className="font-semibold">{surahName(n + 1)}</span>
              </span>
              <span aria-hidden>←</span>
            </Link>
          )}
        </div>
      </div>
    </>
  );
}