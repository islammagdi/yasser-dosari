"use client";

import { useL } from "@/lib/i18n/client";
import Link from "@/lib/i18n/nav";
import { useEffect, useState } from "react";
import type { Recording } from "@/types";
import { pickForDate } from "@/lib/dailyPick";
import { makkahToday } from "@/lib/imamate";
import { isPlayable } from "@/lib/labels";
import { useKhatma } from "@/lib/useKhatma";
import { useInProgress } from "@/lib/useProgress";
import { usePlayer } from "./PlayerProvider";
import { CategoryIcon, PauseIcon, PlayIcon } from "./icons";

const KHATMA_TOTAL = 114;

const box = "flex min-w-0 rounded-3xl border border-line bg-raised p-5 shadow-soft sm:p-6";
const card = `${box} flex-col gap-3`;
const playBtn =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink transition-colors duration-300 ease-out hover:bg-accent-hover active:scale-[0.98] disabled:opacity-40";

/**
 * «النهارده» تحت الهيرو: تلاوة اليوم، وكمّل من حيث وقفت، والختمة.
 * بيحل محل HomeStrip القديم (الإمامة القادمة اتنقلت جوه الهيرو).
 */
export function TodayStrip({ dailyPool, dailyPinned }: { dailyPool: Recording[]; dailyPinned: Record<string, Recording> }) {
  const { t } = useL();
  return (
    <section aria-labelledby="today-title" className="flex flex-col gap-5">
      <h2 id="today-title" className="heading-4 sm:heading-3">
        {t("النهارده")}
      </h2>
      <div className="grid gap-4 md:grid-cols-3 md:gap-6">
        <DailyCard pool={dailyPool} pinned={dailyPinned} />
        <ContinueCard />
        <KhatmaCard />
      </div>
    </section>
  );
}

function DailyCard({ pool, pinned }: { pool: Recording[]; pinned: Record<string, Recording> }) {
  const { t, recTitle, recSubtitle, formatDuration } = useL();
  const { current, isPlaying, playQueue, toggle } = usePlayer();
  // بتاريخ مكة في المتصفح، عشان تتغير مع اليوم حتى لو الصفحة متخزنة من امبارح
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(makkahToday(new Date())), []);
  const r = today ? pinned[today] ?? pickForDate(today, pool) : undefined;

  if (!r) {
    return (
      <div className={card} aria-busy={today === null}>
        <span className="caption-3 text-gold">{t("تلاوة اليوم")}</span>
        <span aria-hidden className="h-5 w-3/4 animate-pulse rounded bg-fg/10" />
        <span aria-hidden className="h-4 w-1/2 animate-pulse rounded bg-fg/10" />
      </div>
    );
  }
  const isCurrent = current?.id === r.id;
  const playingNow = isCurrent && isPlaying;
  return (
    <div className={card}>
      <span className="caption-3 text-gold">{t("تلاوة اليوم")}</span>
      <Link href={`/${r.category}/${r.id}`} className="line-clamp-2 title-2 hover:text-emerald dark:hover:text-gold-soft">
        {recTitle(r)}
      </Link>
      <div className="mt-auto flex items-center justify-between gap-3">
        <span className="truncate caption-2 text-muted">
          {[recSubtitle(r), r.durationSec ? formatDuration(r.durationSec) : null].filter(Boolean).join(" · ")}
        </span>
        <button
          type="button"
          onClick={() => (isCurrent ? toggle() : playQueue([r], 0))}
          disabled={!isPlayable(r)}
          aria-label={`${playingNow ? t("إيقاف") : t("تشغيل")} ${recTitle(r)}`}
          className={playBtn}
        >
          {playingNow ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}

function ContinueCard() {
  const { t, formatDuration, recTitle } = useL();
  const [item] = useInProgress(1);
  const { current, isPlaying, playQueue, toggle } = usePlayer();

  if (!item) {
    return (
      <Link href="/fard" className={`${card} transition-colors duration-300 ease-out hover:border-line-strong`}>
        <span className="caption-3 text-gold">{t("أحدث صلوات الحرم")}</span>
        <span className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-fg/5 text-emerald dark:text-gold">
            <CategoryIcon category="fard" className="h-5 w-5" />
          </span>
          <span className="title-2">{t("تصفّح الفروض")}</span>
        </span>
      </Link>
    );
  }

  const { rec, t: at, d } = item;
  const isCurrent = current?.id === rec.id;
  const playingNow = isCurrent && isPlaying;
  return (
    <div className={card}>
      <span className="caption-3 text-gold">{t("كمّل من حيث وقفت")}</span>
      <Link href={`/${rec.category}/${rec.id}`} className="line-clamp-2 title-2 hover:text-emerald dark:hover:text-gold-soft">
        {recTitle(rec)}
      </Link>
      <div className="mt-auto flex items-center justify-between gap-3">
        <span className="caption-2 text-muted">
          {t("متبقٍ")} {formatDuration(d - at)}
        </span>
        <button
          type="button"
          onClick={() => (isCurrent ? toggle() : playQueue([rec], 0))}
          aria-label={`${playingNow ? t("إيقاف") : t("كمّل")} ${recTitle(rec)}`}
          className={playBtn}
        >
          {playingNow ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}

function KhatmaCard() {
  const { t, toArabicDigits } = useL();
  const k = useKhatma();
  const r = 22;
  const c = 2 * Math.PI * r;
  const pct = k.ready ? k.count / KHATMA_TOTAL : 0;

  return (
    <Link href="/mushaf" className={`${box} items-center gap-4 transition-colors duration-300 ease-out hover:border-line-strong`}>
      <svg aria-hidden viewBox="0 0 56 56" className="h-16 w-16 shrink-0 -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" strokeWidth="6" className="stroke-fg/10" />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="stroke-emerald transition-[stroke-dashoffset] duration-700 ease-out dark:stroke-gold"
        />
      </svg>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="caption-3 text-gold">{t("ختمتك مع الشيخ")}</span>
        <span className="title-2">
          {!k.ready
            ? "…"
            : k.count === 0
              ? t("ابدأ ختمة بصوت الشيخ")
              : t("{n} من {total} سورة", { n: toArabicDigits(k.count), total: toArabicDigits(KHATMA_TOTAL) })}
        </span>
      </span>
    </Link>
  );
}
