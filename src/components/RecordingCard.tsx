"use client";

import Link from "next/link";
import type { Recording } from "@/types";
import { formatDate, formatDuration, toArabicDigits } from "@/lib/format";
import { isPlayable } from "@/lib/labels";
import { RecordingCover } from "./RecordingCover";
import { EqualizerIcon, HeartIcon, PauseIcon, PlayIcon } from "./icons";

interface Props {
  recording: Recording;
  /** رقم يظهر على الغلاف (رقم السورة أو الليلة) */
  position?: number;
  badge?: string;
  isCurrent: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  favorite?: boolean;
  onToggleFavorite?: () => void;
  /** المصحف: السورة اتسمعت في الختمة */
  listened?: boolean;
}

/**
 * الضغط على الكارت بيفتح صفحة التلاوة، وزرار التشغيل بيشغّلها مكانها.
 * الرابط ممدود على الكارت كله، والمحتوى فوقه مش بيستقبل ضغطات (pointer-events-none)
 * إلا زرار التشغيل والقلب.
 */
export function RecordingCard({ recording, position, badge, isCurrent, isPlaying, onPlay, favorite = false, onToggleFavorite, listened = false }: Props) {
  const unavailable = !isPlayable(recording);
  const playingNow = isCurrent && isPlaying;
  const meta = [recording.subtitle, formatDate(recording.date), formatDuration(recording.durationSec)].filter(Boolean);

  return (
    <li
      className={`group relative flex min-w-0 flex-col gap-3 rounded-3xl p-2 transition-colors ${
        isCurrent ? "bg-white/[0.07] ring-1 ring-inset ring-gold/40" : "hover:bg-white/5"
      }`}
    >
      <Link href={`/${recording.category}/${recording.id}`} aria-label={recording.title} className="absolute inset-0 rounded-3xl" />

      <span className="pointer-events-none relative block aspect-square w-full overflow-hidden rounded-2xl">
        <RecordingCover
          recording={recording}
          size="lg"
          label={position != null ? toArabicDigits(position) : undefined}
          sizes="(min-width: 1024px) 260px, (min-width: 640px) 30vw, 45vw"
          className="h-full w-full"
        />
        {badge && (
          <span className="absolute start-2 top-2 rounded-full bg-ink/75 px-2.5 py-1 text-xs font-medium text-gold-soft">
            {badge}
          </span>
        )}
        {listened && (
          <span className="absolute start-2 top-2 flex items-center gap-1 rounded-full bg-ink/80 px-2.5 py-1 text-xs font-medium text-gold-soft">
            ✓ سمعتها
          </span>
        )}
        {playingNow && (
          <span className="absolute inset-0 flex items-center justify-center bg-ink/50">
            <EqualizerIcon className="h-9 w-9 text-gold" />
          </span>
        )}

        <button
          type="button"
          onClick={onPlay}
          disabled={unavailable}
          aria-label={unavailable ? `${recording.title}: غير متاح بعد` : `${playingNow ? "إيقاف" : "تشغيل"} ${recording.title}`}
          className={`pointer-events-auto absolute bottom-2 end-2 flex h-12 w-12 items-center justify-center rounded-full shadow-float transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            isCurrent ? "bg-gold text-gold-ink" : "bg-ink/80 text-text hover:bg-gold hover:text-gold-ink"
          }`}
        >
          {playingNow ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
        </button>

        {onToggleFavorite && (
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-pressed={favorite}
            aria-label={`${favorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}: ${recording.title}`}
            className={`pointer-events-auto absolute end-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-ink/75 transition-colors hover:bg-ink ${
              favorite ? "text-[#E5636B]" : "text-text/80 hover:text-text"
            }`}
          >
            <HeartIcon filled={favorite} className="h-[18px] w-[18px]" />
          </button>
        )}
      </span>

      <span className="pointer-events-none relative flex min-w-0 flex-col gap-1 px-1 pb-1">
        <span className={`line-clamp-2 text-[15px] font-semibold leading-6 ${isCurrent ? "text-gold-soft" : "group-hover:text-gold-soft"}`}>
          {recording.title}
        </span>
        {meta.length > 0 && <span className="truncate text-xs text-muted">{meta.join("، ")}</span>}
      </span>
    </li>
  );
}