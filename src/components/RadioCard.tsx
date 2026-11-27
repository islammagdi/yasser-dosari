"use client";

import { useL } from "@/lib/i18n/client";
import Link from "@/lib/i18n/nav";
import { useRadioSeen } from "@/lib/useRadioSeen";
import { usePlayer } from "./PlayerProvider";

/**
 * إعلان الإذاعة: أول حاجة في الرئيسية (فوق الهيرو).
 * زرار التشغيل بيودّي لـ /radio?play=1 والإذاعة بتشتغل علطول، والكارت كله بيفتح صفحة الإذاعة.
 * علامة «جديد» بتختفي بعد أول تشغيل للإذاعة.
 */
export function RadioCard() {
  const { t } = useL();
  const p = usePlayer();
  const seen = useRadioSeen();
  const onAir = Boolean(p.radio && p.isPlaying);

  return (
    <section
      aria-labelledby="home-radio-title"
      className="relative z-10 overflow-hidden rounded-[2rem] border border-gold/30 bg-raised/70 shadow-float backdrop-blur-md bg-gradient-to-l from-accent/15 via-accent/5 to-gold/10 p-5 sm:p-7"
    >
      {/* موجات راديو باهتة في الخلفية */}
      <svg
        aria-hidden
        viewBox="0 0 200 200"
        className="pointer-events-none absolute -end-10 -top-10 h-56 w-56 text-gold/15 sm:h-72 sm:w-72"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
      >
        <circle cx="100" cy="100" r="30" />
        <circle cx="100" cy="100" r="60" />
        <circle cx="100" cy="100" r="90" />
      </svg>

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {!seen && (
              <span className="rounded-full bg-[#CDAA62] px-2.5 py-0.5 text-xs font-bold text-[#1A1408]">{t("جديد")}</span>
            )}
            {onAir && (
              <span className="flex items-center gap-1.5 rounded-full bg-[#E5484D] px-2.5 py-0.5 text-xs font-bold text-white">
                <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-white motion-reduce:animate-none" />
                {t("على الهواء")}
              </span>
            )}
          </div>
          <h2 id="home-radio-title" className="font-display text-2xl font-bold sm:text-3xl">
            <Link href="/radio" className="hover:text-gold-soft">
              {t("إذاعة الشيخ ياسر الدوسري")}
            </Link>
          </h2>
          <p className="text-muted">{t("تلاوات مختارة عشوائيًا تشتغل ورا بعض من غير توقف.")}</p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {p.radio ? (
            <button
              type="button"
              onClick={p.toggle}
              className="flex min-h-12 items-center gap-2 rounded-full bg-accent px-6 font-semibold text-[#fff] shadow-float transition-transform hover:scale-[1.03] active:scale-95 dark:text-accent-ink"
            >
              {onAir ? <PauseGlyph /> : <PlayGlyph />}
              {onAir ? t("إيقاف الإذاعة") : t("تشغيل الإذاعة")}
            </button>
          ) : (
            <Link
              href="/radio?play=1"
              className="flex min-h-12 items-center gap-2 rounded-full bg-accent px-6 font-semibold text-[#fff] shadow-float transition-transform hover:scale-[1.03] active:scale-95 dark:text-accent-ink"
            >
              <PlayGlyph />
              {t("اسمع الإذاعة")}
            </Link>
          )}
          <Link
            href="/radio"
            className="flex min-h-12 items-center rounded-full border border-line-strong px-5 text-sm font-semibold transition-colors hover:border-gold/60 hover:text-gold-soft"
          >
            {t("القنوات")}
          </Link>
        </div>
      </div>
    </section>
  );
}

const PlayGlyph = () => (
  <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
  </svg>
);
const PauseGlyph = () => (
  <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <rect x="6" y="5" width="4" height="14" rx="1.2" />
    <rect x="14" y="5" width="4" height="14" rx="1.2" />
  </svg>
);
