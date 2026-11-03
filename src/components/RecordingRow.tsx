"use client";

import type { Recording } from "@/types";

import { formatDate, formatDuration, toArabicDigits } from "@/lib/format";
import { EqualizerIcon, PauseIcon, PlayIcon } from "./icons";
import { RecordingCover } from "./RecordingCover";

interface Props {
  recording: Recording;
  position?: number;
  badge?: string;
  /** يظهر الشهر والسنة الهجرية (مفيد في الرئيسية، مش محتاجينه جوه تاب السنة) */
  showPeriod?: boolean;
  isCurrent: boolean;
  isPlaying: boolean;
  onPlay: () => void;
}


export function RecordingRow({ recording, position, badge, showPeriod = false, isCurrent, isPlaying, onPlay }: Props) {
  const date = formatDate(recording.date);
  const duration = formatDuration(recording.durationSec);

  const unavailable = !recording.audioUrl;
  const playingNow = isCurrent && isPlaying;

  return (
    <li
      className={`group flex items-center gap-4 rounded-2xl px-3 py-3 transition-colors sm:px-4 ${
       isCurrent ? "bg-white/[0.07] ring-1 ring-inset ring-gold/40" : "hover:bg-white/5"
      }`}
    >
      <span className="relative h-14 w-14 shrink-0">
        <RecordingCover
          recording={recording}
          label={position != null ? toArabicDigits(position) : undefined}
          className="h-14 w-14 rounded-xl"
        />
        {playingNow && (
          <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-ink/60">
            <EqualizerIcon className="h-5 w-5 text-gold" />
          </span>
        )}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className={`truncate text-[17px] font-semibold ${isCurrent ? "text-gold-soft" : ""}`}>{recording.title}</span>
        {(badge || recording.subtitle || date) && (
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            {badge && (
              <span className="rounded-full bg-gold/10 px-2.5 py-0.5 text-xs font-medium text-gold-soft ring-1 ring-inset ring-gold/25">
                {badge}
              </span>
            )}

            {recording.subtitle && <span>{recording.subtitle}</span>}
            {date && <time dateTime={recording.date}>{date}</time>}
          </span>
        )}
      </div>
      {duration && <span className="hidden shrink-0 text-sm tabular-nums text-muted sm:block">{duration}</span>}
      <button
        type="button"
        onClick={onPlay}
        disabled={unavailable}
        aria-label={unavailable ? `${recording.title}: غير متاح بعد` : `${playingNow ? "إيقاف" : "تشغيل"} ${recording.title}`}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
          isCurrent
            ? "bg-gold text-gold-ink shadow-glow"
            :"bg-white/10 text-text group-hover:bg-gold group-hover:text-gold-ink disabled:group-hover:bg-white/10 disabled:group-hover:text-text"
        }`}
      >
        {playingNow ? <PauseIcon className="h-[18px] w-[18px]" /> : <PlayIcon className="h-[18px] w-[18px]" />}
      </button>
    </li>
  );
}