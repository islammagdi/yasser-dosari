"use client";

import type { Recording } from "@/types";
import { formatDate, formatDuration, toArabicDigits } from "@/lib/format";
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
}

/** كارت مربع: الغلاف فوق والعنوان تحت، والكارت كله زرار تشغيل */
export function RecordingCard({ recording, position, badge, isCurrent, isPlaying, onPlay, favorite = false, onToggleFavorite }: Props) {
  const unavailable = !recording.audioUrl;
  const playingNow = isCurrent && isPlaying;
  const meta = [recording.subtitle, formatDate(recording.date), formatDuration(recording.durationSec)].filter(Boolean);

  return (
    <li className="relative min-w-0">
      <button
        type="button"
        onClick={onPlay}
        disabled={unavailable}
        aria-label={unavailable ? `${recording.title}: غير متاح بعد` : `${playingNow ? "إيقاف" : "تشغيل"} ${recording.title}`}
        className={`group flex w-full flex-col gap-3 rounded-3xl p-2 text-start transition-colors disabled:cursor-not-allowed ${
          isCurrent ? "bg-white/[0.07] ring-1 ring-inset ring-gold/40" : "hover:bg-white/5"
        }`}
      >
        <span className="relative block aspect-square w-full overflow-hidden rounded-2xl">
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
          {playingNow && (
            <span className="absolute inset-0 flex items-center justify-center bg-ink/50">
              <EqualizerIcon className="h-9 w-9 text-gold" />
            </span>
          )}
          <span
            className={`absolute bottom-2 end-2 flex h-11 w-11 items-center justify-center rounded-full shadow-float transition-colors group-disabled:opacity-40 ${
              isCurrent ? "bg-gold text-gold-ink" : "bg-ink/75 text-text group-hover:bg-gold group-hover:text-gold-ink"
            }`}
          >
            {playingNow ? <PauseIcon className="h-[18px] w-[18px]" /> : <PlayIcon className="h-[18px] w-[18px]" />}
          </span>
        </span>
        <span className="flex min-w-0 flex-col gap-1 px-1 pb-1">
          <span className={`line-clamp-2 text-[15px] font-semibold leading-6 ${isCurrent ? "text-gold-soft" : ""}`}>
            {recording.title}
          </span>
          {meta.length > 0 && <span className="truncate text-xs text-muted">{meta.join("، ")}</span>}
        </span>
      </button>
      {/* زرار المفضلة: برّه زرار التشغيل (مينفعش زرار جوه زرار) ومتحط فوق الغلاف */}
      {onToggleFavorite && (
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-pressed={favorite}
          aria-label={`${favorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}: ${recording.title}`}
          className={`absolute end-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-ink/75 transition-colors hover:bg-ink ${
            favorite ? "text-[#E5636B]" : "text-text/80 hover:text-text"
          }`}
        >
          <HeartIcon filled={favorite} className="h-[18px] w-[18px]" />
        </button>
      )}
    </li>
  );
}