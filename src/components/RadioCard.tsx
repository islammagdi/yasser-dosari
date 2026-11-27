"use client";

import { useL } from "@/lib/i18n/client";
import Link from "@/lib/i18n/nav";
import { usePlayer } from "./PlayerProvider";

/** كارت الإذاعة في الرئيسية: بيودّي لصفحة /radio، وبيبيّن لو الإذاعة شغّالة */
export function RadioCard() {
  const { t } = useL();
  const p = usePlayer();
  const onAir = Boolean(p.radio && p.isPlaying);

  return (
    <Link
      href="/radio"
      className="glass-card group flex items-center gap-4 rounded-3xl p-5 transition-colors hover:bg-fg/5 sm:p-6"
    >
      <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent text-[#fff] dark:text-accent-ink">
        {onAir && <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-accent/30 motion-reduce:animate-none" />}
        <svg aria-hidden viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="2" />
          <path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8" />
        </svg>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center gap-2">
          <span className="font-display text-xl font-bold sm:text-2xl">{t("إذاعة الشيخ ياسر الدوسري")}</span>
          {onAir && (
            <span className="rounded-full bg-[#E5484D] px-2 py-0.5 text-[11px] font-bold text-white">{t("على الهواء")}</span>
          )}
        </span>
        <span className="text-sm text-muted">{t("تلاوات مختارة عشوائيًا تشتغل ورا بعض من غير توقف.")}</span>
      </span>
      <span className="hidden shrink-0 rounded-full border border-line-strong px-5 py-2.5 text-sm font-semibold transition-colors group-hover:border-gold/60 group-hover:text-gold-soft sm:block">
        {t("اسمع الإذاعة")}
      </span>
    </Link>
  );
}
