"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ImamateSlot } from "@/types";
import { formatDuration, toArabicDigits } from "@/lib/format";
import { hijriDayLabel, isNowLive, nextSlot, prayerTitle, relativeDayLabel } from "@/lib/imamate";
import { useKhatma } from "@/lib/useKhatma";
import { useInProgress } from "@/lib/useProgress";
import { usePlayer } from "./PlayerProvider";
import { CategoryIcon, MosqueIcon, PauseIcon, PlayIcon } from "./icons";

const KHATMA_TOTAL = 114;

/** بداية الصلاة (وقت الأذان) بتوقيت مكة (UTC+3 ثابت) كـ timestamp، لو الجدول فيه الوقت */
function slotTime(slot: ImamateSlot): number | null {
  if (!slot.start) return null;
  const t = Date.parse(`${slot.date}T${slot.start}:00+03:00`);
  return Number.isFinite(t) ? t : null;
}

const cell = "relative flex min-h-[92px] min-w-0 items-center gap-4 px-5 py-4 sm:px-6";
const iconBox = "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-fg/5 text-emerald dark:text-gold";

/** شريط تحت الهيرو: الإمامة القادمة، والختمة، وكمّل الاستماع. نفس الوزن، ومش بينافس الهيرو */
export function HomeStrip({ slots }: { slots: ImamateSlot[] }) {
  return (
    <div className="grid overflow-hidden rounded-[26px] border border-line bg-raised shadow-soft md:grid-cols-[1.25fr_1fr_1fr] [&>*+*]:border-t [&>*+*]:border-line md:[&>*+*]:border-s md:[&>*+*]:border-t-0">
      <ImamateCell slots={slots} />
      <KhatmaCell />
      <ContinueCell />
    </div>
  );
}

function ImamateCell({ slots }: { slots: ImamateSlot[] }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const slot = now ? nextSlot(slots, now) : null;
  const live = !!(now && slot && isNowLive(slot, now));
  const at = slot ? slotTime(slot) : null;
  const left = now && at ? at - now.getTime() : null;
  // العدّاد بيظهر بس لو الصلاة خلال ٢٤ ساعة، غير كده بنكتفي باليوم
  const showCount = left !== null && left > 0 && left < 24 * 3600_000;
  const parts = showCount
    ? [Math.floor(left / 3600_000), Math.floor((left % 3600_000) / 60_000), Math.floor((left % 60_000) / 1000)]
    : null;

  return (
    <Link href="/imamate" className={`${cell} flex-wrap transition-colors hover:bg-fg/[0.03] lg:flex-nowrap`} aria-live="polite">
      <span className={iconBox}>
        <MosqueIcon className="h-6 w-6" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[13px] text-muted">{live ? "الآن في المسجد الحرام" : "الإمامة القادمة في الحرم"}</span>
        {now === null ? (
          <span aria-hidden className="my-1.5 h-4 w-40 animate-pulse rounded bg-fg/10" />
        ) : slot ? (
          <span className="truncate font-semibold leading-7">
            {prayerTitle(slot.prayer)}، {live ? "بإمامة الشيخ" : relativeDayLabel(slot.nightOf ?? slot.date, now) || hijriDayLabel(slot.date)}
          </span>
        ) : (
          <span className="text-sm leading-6">الجدول بيتعلن أسبوعيًا</span>
        )}
      </span>
      {parts && !live && (
        <span className="flex shrink-0 basis-full items-baseline gap-1 ps-16 lg:basis-auto lg:ps-0" aria-label={`بعد ${parts[0]} ساعة و${parts[1]} دقيقة`}>
          {parts.map((n, i) => (
            <span key={i} className="flex items-baseline gap-1">
              <b className="rounded-xl bg-fg/5 px-2 pb-0.5 pt-1.5 font-display text-2xl leading-none text-emerald tabular-nums dark:text-gold-soft">
                {toArabicDigits(n).padStart(2, "٠")}
              </b>
              <span className="text-[11px] text-muted">{["س", "د", "ث"][i]}</span>
            </span>
          ))}
        </span>
      )}
    </Link>
  );
}

function KhatmaCell() {
  const k = useKhatma();
  const r = 22;
  const c = 2 * Math.PI * r;
  const pct = k.ready ? k.count / KHATMA_TOTAL : 0;

  return (
    <Link href="/mushaf" className={`${cell} transition-colors hover:bg-fg/[0.03]`}>
      <svg aria-hidden viewBox="0 0 56 56" className="h-14 w-14 shrink-0 -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" strokeWidth="6" className="stroke-fg/10" />
        <circle
          cx="28" cy="28" r={r} fill="none" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          className="stroke-emerald transition-[stroke-dashoffset] duration-700 dark:stroke-gold"
        />
      </svg>
      <span className="flex min-w-0 flex-col">
        <span className="text-[13px] text-muted">ختمتك مع الشيخ</span>
        <span className="truncate font-semibold leading-7">
          {!k.ready ? "…" : k.count === 0 ? "ابدأ ختمة بصوت الشيخ" : `${toArabicDigits(k.count)} من ${toArabicDigits(KHATMA_TOTAL)} سورة`}
        </span>
      </span>
    </Link>
  );
}

function ContinueCell() {
  const [item] = useInProgress(1);
  const { current, isPlaying, playQueue, toggle } = usePlayer();

  if (!item) {
    return (
      <Link href="/fard" className={`${cell} transition-colors hover:bg-fg/[0.03]`}>
        <span className={iconBox}>
          <CategoryIcon category="fard" className="h-6 w-6" />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-[13px] text-muted">أحدث صلوات الحرم</span>
          <span className="truncate font-semibold leading-7">تصفّح الفروض</span>
        </span>
      </Link>
    );
  }

  const { rec, t, d } = item;
  const isCurrent = current?.id === rec.id;
  const playingNow = isCurrent && isPlaying;
  return (
    <div className={cell}>
      <button
        type="button"
        onClick={() => (isCurrent ? toggle() : playQueue([rec], 0))}
        aria-label={`${playingNow ? "إيقاف" : "كمّل"} ${rec.title}`}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink transition-colors hover:bg-accent-hover"
      >
        {playingNow ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
      </button>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[13px] text-muted">كمّل من حيث وقفت</span>
        <Link href={`/${rec.category}/${rec.id}`} className="truncate font-semibold leading-7 hover:text-gold-soft">
          {rec.title}
        </Link>
        <span className="text-xs text-muted">متبقٍ {formatDuration(d - t)}</span>
      </span>
    </div>
  );
}
