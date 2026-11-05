import type { Metadata } from "next";
import Link from "next/link";
import { toArabicDigits } from "@/lib/format";
import { SURAH_NAMES } from "@/lib/quran";
import { loadSurahIndex } from "@/lib/surahData";

export const revalidate = 21600;

export const metadata: Metadata = {
  title: "السور",
  description: "تلاوات الشيخ ياسر الدوسري مرتبة بالسور: التلاوة الكاملة من المصحف، وكل ما قرأه من السورة في صلوات المسجد الحرام.",
  alternates: { canonical: "/surah" },
};

/** فهرس السور: كل سورة وعدد التلاوات اللي فيها */
export default async function SurahIndexPage() {
  const index = await loadSurahIndex();

  return (
    <>
      <div aria-hidden className="pattern-stars page-pattern" />
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">السور</h1>
          <p className="max-w-2xl text-lg leading-8 text-muted">
            اختر سورة لتسمعها كاملة من المصحف، ومعها كل ما قرأه الشيخ منها في صلوات المسجد الحرام.
          </p>
        </div>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
          {SURAH_NAMES.map((name, i) => {
            const n = i + 1;
            const count = index.get(n)?.length ?? 0;
            return (
              <li key={n}>
                <Link
                  href={`/surah/${n}`}
                  className="glass-card flex min-h-[72px] items-center gap-3 rounded-2xl p-3 transition-colors hover:border-gold/40"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 text-sm font-semibold text-gold-soft">
                    {toArabicDigits(n)}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-display text-xl font-bold">{name}</span>
                    <span className="text-xs text-muted">
                      {count > 0 ? `${toArabicDigits(count)} تلاوة` : "لا توجد تلاوات بعد"}
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