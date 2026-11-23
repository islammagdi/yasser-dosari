import type { Metadata } from "next";
import Link from "@/lib/i18n/nav";
import { SURAH_NAMES } from "@/lib/quran";
import { loadSurahIndex } from "@/lib/surahData";
import { pageL, pageMeta, type LangParams } from "@/lib/i18n/server";

export const revalidate = 21600;

export function generateMetadata({ params }: { params: LangParams }): Metadata {
  return pageMeta(params, "/surah", {
    title: "السور",
    description: "تلاوات الشيخ ياسر الدوسري مرتبة بالسور: التلاوة الكاملة من المصحف، وكل ما قرأه من السورة في صلوات المسجد الحرام.",
  });
}

/** فهرس السور: كل سورة وعدد التلاوات اللي فيها */
export default async function SurahIndexPage({ params }: { params: LangParams }) {
  const { t, toArabicDigits, surahName, recitationsLabel } = pageL(params);
  const index = await loadSurahIndex();

  return (
    <>
      <div aria-hidden className="pattern-stars page-pattern" />
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">{t("السور")}</h1>
          <p className="max-w-2xl text-lg leading-8 text-muted">
            
            {t("اختر سورة لتسمعها كاملة من المصحف، ومعها كل ما قرأه الشيخ منها في صلوات المسجد الحرام.")}
          </p>
        </div>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
          {SURAH_NAMES.map((_, i) => {
            const n = i + 1;
            const name = surahName(n);
            const count = index.get(n)?.length ?? 0;
            return (
              <li key={n}>
                <Link
                  href={`/surah/${n}`}
                  className="glass-card flex min-h-[72px] items-center gap-3 rounded-2xl p-3 transition-colors hover:border-gold/40"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fg/5 text-sm font-semibold text-gold-soft">
                    {toArabicDigits(n)}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-display text-xl font-bold">{name}</span>
                    <span className="text-xs text-muted">
                      {count > 0 ? recitationsLabel(count) : t("لا توجد تلاوات بعد")}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}