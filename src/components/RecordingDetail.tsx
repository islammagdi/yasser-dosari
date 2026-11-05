"use client";

import Link from "next/link";
import type { Recording } from "@/types";
import { getCategory } from "@/lib/categories";
import { formatDuration, toArabicDigits } from "@/lib/format";
import { surahName } from "@/lib/quran";
import { surahsMentioned } from "@/lib/surahIndex";
import { isPlayable } from "@/lib/labels";
import { useFavorites } from "@/lib/useFavorites";
import { useProgressTime } from "@/lib/useProgress";
import { usePlayer } from "./PlayerProvider";
import { RecordingCover } from "./RecordingCover";
import { ShareBox } from "./ShareBox";
import { HeartIcon, PauseIcon, PlayIcon } from "./icons";

/** رأس صفحة التلاوة: الغلاف والعنوان والتشغيل والمفضلة والمشاركة */
export function RecordingDetail({ recording: r, queue, startAt }: { recording: Recording; queue: Recording[]; startAt: number }) {
  const p = usePlayer();
  // لو بدأها قبل كده: الزرار بيقول "أكمل من" وبيكمّل من مكانه
  const resumeSec = useProgressTime(r.id);
  const fav = useFavorites();
  const category = getCategory(r.category);
  const isCurrent = p.current?.id === r.id;
  const playingNow = isCurrent && p.isPlaying;
  const favorite = fav.isFavorite(r.id);
  const number = r.surah ?? r.night;
  const surahs = surahsMentioned(r);

  return (
    <article className="grid items-start gap-8 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:gap-12">
      <RecordingCover
        recording={r}
        size="lg"
        label={number != null ? toArabicDigits(number) : undefined}
        sizes="(min-width: 768px) 320px, 90vw"
        className="mx-auto aspect-square w-full max-w-[320px] rounded-3xl shadow-float"
      />
      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-col gap-3">
          {category && (
            <Link href={`/${category.slug}`} className="self-start text-[15px] font-medium text-gold underline-offset-4 hover:underline">
              {category.title}
            </Link>
          )}
          <h1 className="font-display text-3xl font-bold leading-snug sm:text-4xl lg:text-5xl">{r.title}</h1>
          {r.subtitle && <p className="text-lg leading-8 text-muted">{r.subtitle}</p>}
          {/* السور اللي في التلاوة: كل واحدة بتودّي لصفحتها بباقي تلاواتها */}
          {surahs.length > 0 && (
            <ul aria-label="السور في هذه التلاوة" className="flex flex-wrap gap-2">
              {surahs.map((n) => (
                <li key={n}>
                  <Link
                    href={`/surah/${n}`}
                    className="inline-flex min-h-9 items-center rounded-full border border-line-strong px-3.5 text-sm text-gold-soft transition-colors hover:border-gold/50"
                  >
                    كل تلاوات سورة {surahName(n)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {r.durationSec ? <p className="text-sm text-muted">المدة: {formatDuration(r.durationSec)}</p> : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => (isCurrent ? p.toggle() : p.playQueue(queue, 0, startAt || undefined))}
            disabled={!isPlayable(r)}
            className="flex min-h-14 items-center gap-3 rounded-full bg-gold pe-7 ps-2 text-lg font-semibold text-gold-ink shadow-glow transition-colors hover:bg-gold-soft disabled:opacity-40 disabled:shadow-none"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-ink text-gold">
              {playingNow ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
            </span>
            {playingNow
              ? "إيقاف مؤقت"
              : startAt && !isCurrent
                ? `استمع من ${formatDuration(startAt)}`
                : resumeSec && !isCurrent
                  ? `أكمل من ${formatDuration(resumeSec)}`
                  : "استمع"}
          </button>
          <button
            type="button"
            onClick={() => fav.toggle(r.id)}
            aria-pressed={favorite}
            aria-label={favorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
            className={`glass-card flex h-14 w-14 items-center justify-center rounded-full transition-colors ${
              favorite ? "text-[#E5636B]" : "text-muted hover:text-text"
            }`}
          >
            <HeartIcon filled={favorite} className="h-6 w-6" />
          </button>
        </div>

        <ShareBox id={r.id} title={r.title} path={`/${r.category}/${r.id}`} />
      </div>
    </article>
  );
}