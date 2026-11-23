"use client";

import { useL } from "@/lib/i18n/client";
import { toArabicDigits as arDigits } from "@/lib/format";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import type { Ayah } from "@/lib/api/quranText";
import { surahMarkers, type PartMarker } from "@/lib/quranParts";
import { READING_SIZES, useReading } from "@/lib/useReading";
import { AyahSheet } from "./AyahSheet";

const BASMALA = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";
const QUARTER_LABELS = ["", "ربع الحزب", "نصف الحزب", "ثلاثة أرباع الحزب"];

/** سطر "الجزء ١٥ · الحزب ٢٩" في بداية الجزء أو الحزب */
function PartLine({ m }: { m: PartMarker }) {
  const { t, toArabicDigits, dir } = useL();
  return (
    <span dir={dir} className="my-4 flex items-center gap-3 font-sans text-sm text-gold-soft" style={{ fontSize: "0.875rem", lineHeight: 1.5 }}>
      <span aria-hidden className="h-px flex-1 bg-gradient-to-l ltr:bg-gradient-to-r from-gold/40 to-transparent" />
      {m.juz ? `${t("الجزء {n}", { n: toArabicDigits(m.juz) })} · ` : ""}{t("الحزب {n}", { n: toArabicDigits(m.hizb) })}
      <span aria-hidden className="h-px flex-1 bg-gradient-to-r ltr:bg-gradient-to-l from-gold/40 to-transparent" />
    </span>
  );
}

/** نص السورة للقراءة: علامات الأجزاء والأحزاب، والضغط على آية بيفتح قايمتها */
export function QuranReader({ surah, ayahs, basmala, translation }: { surah: number; ayahs: Ayah[]; basmala: boolean; translation?: string[] }) {
  const withMeaning = !!translation?.length;
  const { t, toArabicDigits } = useL();
  const { size, setSize, setLast, bookmark, setBookmark, theme, setTheme } = useReading();
  const light = theme === "light";
  const [open, setOpen] = useState<Ayah | null>(null);
  const markers = useMemo(() => surahMarkers(surah), [surah]);
  const firstMarker = markers.get(1);

  useEffect(() => setLast(surah), [surah, setLast]);

  // جاي من نتيجة بحث (أو علامة): الآية اللي في الرابط (#ayah-12) بتتعلّم وتنزل الشاشة عليها،
  // والعلامة بتخف لوحدها بعد شوية
  const [highlight, setHighlight] = useState<number | null>(null);
  useEffect(() => {
    let timer = 0;
    let done = 0; // آخر آية اتعلّمت، عشان المحاولات المتكررة متعيدش العلامة
    const tries: number[] = [];
    const apply = () => {
      const n = Number(window.location.hash.match(/^#ayah-(\d+)$/)?.[1]);
      const el = n ? document.getElementById(`ayah-${n}`) : null;
      if (!n || !el) return;
      // السكرول بيتكرر في كل محاولة (لو الـ Next رجّع الصفحة لفوق بعدنا)، والعلامة بتتحط مرة واحدة
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      if (done === n) return;
      done = n;
      setHighlight(n);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setHighlight(null), 8000);
    };
    // لما بنيجي من البحث بـ Link، الـ Next بيحدّث الرابط ويرجّع الصفحة لفوق بعد ما الصفحة تتعرض،
    // فلو علّمنا مرة واحدة على طول بيلاقي الرابط لسه من غير #ayah، أو السكرول بتاعنا بيتلغي.
    // فبنحاول كذا مرة في أول ثانية
    for (const ms of [0, 120, 350, 800]) tries.push(window.setTimeout(apply, ms));
    const onHash = () => {
      done = 0;
      apply();
    };
    window.addEventListener("hashchange", onHash);
    window.addEventListener("popstate", onHash);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("popstate", onHash);
      tries.forEach((t) => window.clearTimeout(t));
      window.clearTimeout(timer);
    };
  }, [surah]);

  const close = useCallback(() => setOpen(null), []);
  const isBookmarked = (n: number) => bookmark?.surah === surah && bookmark.ayah === n;

  const btn =
    "flex h-11 w-11 items-center justify-center rounded-full text-lg font-semibold text-gold-soft transition-colors hover:bg-fg/5 disabled:opacity-30 disabled:hover:bg-transparent";
  const fontSize = `${READING_SIZES[size]}rem`;

  return (
    <section aria-label={t("نص السورة")} className={`glass-card flex flex-col gap-6 rounded-3xl p-5 sm:p-10 ${light ? "reader-light" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">{t("اضغط على أي آية للتفسير والعلامة والمشاركة.")}</p>
        <div className="flex shrink-0 items-center gap-2">
        {/* الوضع الفاتح: لون الورق، أريح في القراءة بالنهار */}
        <button
          type="button"
          onClick={() => setTheme(light ? "dark" : "light")}
          aria-pressed={light}
          aria-label={light ? t("الوضع الداكن") : t("الوضع الفاتح")}
          title={light ? t("الوضع الداكن") : t("الوضع الفاتح")}
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
        <div role="group" aria-label={t("حجم الخط")} className="flex shrink-0 items-center gap-1 rounded-full border border-fg/10 p-1">
          <button type="button" onClick={() => setSize(size - 1)} disabled={size === 0} aria-label={t("تصغير الخط")} className={btn}>
            <span className="text-sm">{t("أ")}</span>
          </button>
          <button
            type="button"
            onClick={() => setSize(size + 1)}
            disabled={size === READING_SIZES.length - 1}
            aria-label={t("تكبير الخط")}
            className={btn}
          >
            <span className="text-xl">{t("أ")}</span>
          </button>
        </div>
        </div>
      </div>

      {/* لو الجزء أو الحزب بيبدأ مع أول السورة، السطر بيتحط فوق البسملة */}
      {firstMarker && firstMarker.quarter === 0 && <PartLine m={firstMarker} />}

      {basmala && (
        <p dir="rtl" lang="ar" className="text-center font-quran text-gold-soft" style={{ fontSize, lineHeight: 2.2 }}>
          {BASMALA}
        </p>
      )}

      <div
        dir="rtl"
        lang="ar"
        className={withMeaning ? "flex flex-col font-quran" : "text-justify font-quran"}
        style={{ fontSize, lineHeight: withMeaning ? 2.1 : 2.4 }}
      >
        {ayahs.map((a) => {
          const m = markers.get(a.n);
          const marked = isBookmarked(a.n);
          return (
            <Fragment key={a.n}>
              {m && a.n > 1 && m.quarter === 0 && <PartLine m={m} />}
              {m && m.quarter > 0 && (
                <span className="text-gold" title={`${t(QUARTER_LABELS[m.quarter])} ${toArabicDigits(m.hizb)}`}>
                  <span aria-hidden>{t("۞")} </span>
                  <span className="sr-only">
                    {t(QUARTER_LABELS[m.quarter])} {toArabicDigits(m.hizb)}
                  </span>
                </span>
              )}
              <span
                id={`ayah-${a.n}`}
                role="button"
                tabIndex={0}
                aria-label={`${t("الآية {n}", { n: toArabicDigits(a.n) })}${marked ? t("، عليها علامة") : ""}`}
                aria-current={highlight === a.n ? "true" : undefined}
                onClick={() => setOpen(a)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen(a))}
                className={`scroll-mt-28 cursor-pointer rounded-lg transition-colors duration-700 hover:text-gold-soft focus-visible:bg-fg/5 focus-visible:outline-none ${
                  open?.n === a.n ? "bg-gold/15 text-gold-soft" : highlight === a.n ? "bg-gold/25 shadow-[0_0_0_6px_rgb(var(--c-gold)/0.25)]" : ""
                } ${marked ? "underline decoration-gold/70 decoration-2 underline-offset-[0.5em]" : ""}`}
              >
                {a.text} <span className="text-gold/80">﴿{arDigits(a.n)}﴾</span>
                {marked && <span aria-hidden className="text-gold"> ★</span>}{" "}
              </span>
              {withMeaning && (
                <p dir="ltr" lang="en" className="mb-5 mt-1 border-b border-fg/10 pb-5 font-sans text-base leading-7 text-text/80" style={{ fontSize: "1rem", lineHeight: 1.75 }}>
                  <span className="me-2 text-sm font-semibold text-gold-soft">{a.n}.</span>
                  {translation![a.n - 1]}
                </p>
              )}
            </Fragment>
          );
        })}
      </div>
      {withMeaning && <p className="text-xs text-muted">Translation of the meanings: Saheeh International (via alquran.cloud).</p>}

      {open && (
        <AyahSheet
          surah={surah}
          ayah={open.n}
          text={open.text}
          ayahs={ayahs}
          bookmarked={isBookmarked(open.n)}
          onToggleBookmark={() => setBookmark(isBookmarked(open.n) ? null : { surah, ayah: open.n })}
          meaning={translation?.[open.n - 1]}
          onClose={close}
        />
      )}
    </section>
  );
}