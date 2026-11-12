"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { SurahStat } from "@/lib/homeCollections";
import { recitationsLabel, toArabicDigits } from "@/lib/format";
import { surahName } from "@/lib/quran";

/** ٥ درجات لون: من مفيش تلاوات لأكتر سورة اتقرت */
const LEVELS = [
  "bg-fg/5 text-muted/70",
  "bg-gold/15 text-text",
  "bg-gold/35 text-text dark:bg-gold/30",
  "bg-emerald/75 text-[#F1EEE6] dark:bg-gold/60 dark:text-[#1A1408]",
  "bg-emerald text-[#E7CD94] dark:bg-gold dark:text-[#1A1408]",
];

/** الحدود بتتحسب من البيانات نفسها (ربع/نص/تلات أرباع)، عشان الخريطة تفضل متوازنة مع ما الأرشيف يكبر */
function thresholds(stats: SurahStat[]): [number, number, number] {
  const counts = stats.map((s) => s.total).filter((c) => c > 0).sort((a, b) => a - b);
  if (!counts.length) return [1, 1, 1];
  const q = (p: number) => counts[Math.min(counts.length - 1, Math.floor(p * counts.length))];
  return [q(0.25), q(0.5), q(0.8)];
}

function levelOf(total: number, [a, b, c]: [number, number, number]) {
  if (total === 0) return 0;
  if (total <= a) return 1;
  if (total <= b) return 2;
  if (total <= c) return 3;
  return 4;
}

/**
 * ابحث بالسورة: كل سور القرآن في خريطة واحدة، والسورة أغمق كل ما الشيخ قرأها مرات أكتر.
 * الضغط على سورة بيعرض تفصيلها، ومنه لصفحة السورة.
 */
export function SurahMap({ stats }: { stats: SurahStat[] }) {
  const t = useMemo(() => thresholds(stats), [stats]);
  const top = useMemo(() => stats.reduce((a, b) => (b.total > a.total ? b : a), stats[0]), [stats]);
  const [selected, setSelected] = useState(top?.n ?? 18);
  const covered = stats.filter((s) => s.total > 0).length;
  if (!covered) return null;

  const s = stats[selected - 1];
  const chips = [
    ["المصحف", s.mushaf],
    ["الفجر", s.fajr],
    ["المغرب", s.maghrib],
    ["العشاء", s.isha],
    ["التراويح", s.taraweeh],
    ["أخرى", s.other],
  ].filter(([, c]) => (c as number) > 0) as [string, number][];

  return (
    <section aria-labelledby="surah-map-title" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="surah-map-title" className="font-display text-3xl font-bold sm:text-4xl">
            ابحث بالسورة
          </h2>
          <p className="max-w-2xl text-muted">
            كل سورة، وكل مرة قرأها الشيخ: في المصحف والفروض والتراويح. كل ما اللون أغمق، التلاوات أكتر.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted" aria-hidden>
          أقل
          {LEVELS.map((l, i) => (
            <i key={i} className={`h-4 w-4 rounded ${l.split(" ").filter((c) => c.includes("bg-")).join(" ")}`} />
          ))}
          أكتر
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 rounded-[26px] border border-line bg-surface p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-4 self-start">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(32px,1fr))] gap-1.5 sm:grid-cols-[repeat(auto-fill,minmax(38px,1fr))]">
          {stats.map((st) => {
            const isSel = st.n === selected;
            return (
              <button
                key={st.n}
                type="button"
                onClick={() => setSelected(st.n)}
                aria-pressed={isSel}
                aria-label={`${surahName(st.n)}: ${st.total ? recitationsLabel(st.total) : "مفيش تلاوات لسه"}`}
                title={surahName(st.n)}
                className={`aspect-square rounded-lg text-[11px] font-semibold tabular-nums transition-transform hover:scale-110 ${LEVELS[levelOf(st.total, t)]} ${
                  isSel ? "relative z-10 scale-110 outline outline-2 outline-offset-2 outline-gold" : ""
                }`}
              >
                {toArabicDigits(st.n)}
              </button>
            );
          })}
        </div>

          {/* ملخص التغطية: جزء من الخريطة نفسها */}
          <p className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-sm text-muted">
            <span>{toArabicDigits(covered)} سورة من ١١٤ ليها تلاوات</span>
            <Link href="/surah" className="font-semibold text-gold-soft underline-offset-4 hover:underline">
              فهرس السور كامل
            </Link>
          </p>
        </div>

        {/* تفصيل السورة المختارة */}
        <div className="flex flex-col rounded-[22px] border border-line bg-raised p-5 shadow-soft" aria-live="polite">
          <p className="text-sm font-semibold text-gold">السورة {toArabicDigits(s.n)}</p>
          <p className="font-display text-3xl font-bold leading-tight">سورة {surahName(s.n)}</p>
          {s.total > 0 ? (
            <>
              <p className="mt-1 text-sm text-muted">{recitationsLabel(s.total)} في الأرشيف</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {chips.map(([label, c]) => (
                  <span key={label} className="flex h-8 items-center gap-1.5 rounded-full bg-fg/5 px-3 text-[13px] font-medium">
                    {label} <b className="text-gold">{toArabicDigits(c)}</b>
                  </span>
                ))}
              </div>
              {s.last && <p className="mt-4 text-[13px] leading-6 text-muted">آخر مرة: {s.last}</p>}
              <Link
                href={`/surah/${s.n}`}
                className="mt-5 flex min-h-11 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent-hover lg:mt-auto"
              >
                اسمع تلاوات السورة
              </Link>
            </>
          ) : (
            <p className="mt-2 text-sm leading-7 text-muted">مفيش تلاوات للسورة دي في الأرشيف لسه.</p>
          )}
        </div>
      </div>

    </section>
  );
}
