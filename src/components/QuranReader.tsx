"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import type { Ayah } from "@/lib/api/quranText";
import { toArabicDigits } from "@/lib/format";
import { surahMarkers, type PartMarker } from "@/lib/quranParts";
import { READING_SIZES, useReading } from "@/lib/useReading";
import { AyahSheet } from "./AyahSheet";

const BASMALA = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";
const QUARTER_LABELS = ["", "ربع الحزب", "نصف الحزب", "ثلاثة أرباع الحزب"];

/** سطر "الجزء ١٥ · الحزب ٢٩" في بداية الجزء أو الحزب */
function PartLine({ m }: { m: PartMarker }) {
  return (
    <span className="my-4 flex items-center gap-3 font-sans text-sm text-gold-soft" style={{ fontSize: "0.875rem", lineHeight: 1.5 }}>
      <span aria-hidden className="h-px flex-1 bg-gradient-to-l from-gold/40 to-transparent" />
      {m.juz ? `الجزء ${toArabicDigits(m.juz)} · ` : ""}الحزب {toArabicDigits(m.hizb)}
      <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
    </span>
  );
}

/** نص السورة للقراءة: علامات الأجزاء والأحزاب، والضغط على آية بيفتح قايمتها */
export function QuranReader({ surah, ayahs, basmala }: { surah: number; ayahs: Ayah[]; basmala: boolean }) {
  const { size, setSize, setLast, bookmark, setBookmark, theme, setTheme } = useReading();
  const light = theme === "light";
  const [open, setOpen] = useState<Ayah | null>(null);
  const markers = useMemo(() => surahMarkers(surah), [surah]);
  const firstMarker = markers.get(1);

  useEffect(() => setLast(surah), [surah, setLast]);

  const close = useCallback(() => setOpen(null), []);
  const isBookmarked = (n: number) => bookmark?.surah === surah && bookmark.ayah === n;

  const btn =
    "flex h-11 w-11 items-center justify-center rounded-full text-lg font-semibold text-gold-soft transition-colors hover:bg-fg/5 disabled:opacity-30 disabled:hover:bg-transparent";
  const fontSize = `${READING_SIZES[size]}rem`;

  return (
    <section aria-label="نص السورة" className={`glass-card flex flex-col gap-6 rounded-3xl p-5 sm:p-10 ${light ? "reader-light" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">اضغط على أي آية للتفسير والعلامة والمشاركة.</p>
        <div className="flex shrink-0 items-center gap-2">
        {/* الوضع الفاتح: لون الورق، أريح في القراءة بالنهار */}
        <button
          type="button"
          onClick={() => setTheme(light ? "dark" : "light")}
          aria-pressed={light}
          aria-label={light ? "الوضع الداكن" : "الوضع الفاتح"}
          title={light ? "الوضع الداكن" : "الوضع الفاتح"}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-fg/10 text-gold-soft transition-colors hover:bg-fg/5"
        >
          {light ? (
            <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
            </svg>
          ) : (
            <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
          )}
        </button>
        <div role="group" aria-label="حجم الخط" className="flex shrink-0 items-center gap-1 rounded-full border border-fg/10 p-1">
          <button type="button" onClick={() => setSize(size - 1)} disabled={size === 0} aria-label="تصغير الخط" className={btn}>
            <span className="text-sm">أ</span>
          </button>
          <button
            type="button"
            onClick={() => setSize(size + 1)}
            disabled={size === READING_SIZES.length - 1}
            aria-label="تكبير الخط"
            className={btn}
          >
            <span className="text-xl">أ</span>
          </button>
        </div>
        </div>
      </div>

      {/* لو الجزء أو الحزب بيبدأ مع أول السورة، السطر بيتحط فوق البسملة */}
      {firstMarker && firstMarker.quarter === 0 && <PartLine m={firstMarker} />}

      {basmala && (
        <p className="text-center font-quran text-gold-soft" style={{ fontSize, lineHeight: 2.2 }}>
          {BASMALA}
        </p>
      )}

      <p className="text-justify font-quran" style={{ fontSize, lineHeight: 2.4 }}>
        {ayahs.map((a) => {
          const m = markers.get(a.n);
          const marked = isBookmarked(a.n);
          return (
            <Fragment key={a.n}>
              {m && a.n > 1 && m.quarter === 0 && <PartLine m={m} />}
              {m && m.quarter > 0 && (
                <span className="text-gold" title={`${QUARTER_LABELS[m.quarter]} ${toArabicDigits(m.hizb)}`}>
                  <span aria-hidden>۞ </span>
                  <span className="sr-only">
                    {QUARTER_LABELS[m.quarter]} {toArabicDigits(m.hizb)}
                  </span>
                </span>
              )}
              <span
                id={`ayah-${a.n}`}
                role="button"
                tabIndex={0}
                aria-label={`الآية ${toArabicDigits(a.n)}${marked ? "، عليها علامة" : ""}`}
                onClick={() => setOpen(a)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen(a))}
                className={`scroll-mt-28 cursor-pointer rounded-lg transition-colors hover:text-gold-soft focus-visible:bg-fg/5 focus-visible:outline-none ${
                  open?.n === a.n ? "bg-gold/15 text-gold-soft" : ""
                } ${marked ? "underline decoration-gold/70 decoration-2 underline-offset-[0.5em]" : ""}`}
              >
                {a.text} <span className="text-gold/80">﴿{toArabicDigits(a.n)}﴾</span>
                {marked && <span aria-hidden className="text-gold"> ★</span>}{" "}
              </span>
            </Fragment>
          );
        })}
      </p>

      {open && (
        <AyahSheet
          surah={surah}
          ayah={open.n}
          text={open.text}
          ayahs={ayahs}
          bookmarked={isBookmarked(open.n)}
          onToggleBookmark={() => setBookmark(isBookmarked(open.n) ? null : { surah, ayah: open.n })}
          onClose={close}
        />
      )}
    </section>
  );
}