"use client";

import Link from "next/link";
import type { Recording } from "@/types";
import { formatDate, formatDuration, toArabicDigits } from "@/lib/format";
import { isPlayable } from "@/lib/labels";
import { useProgressRatio } from "@/lib/useProgress";
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
  /** على الموبايل الكارت بيبقى صف أفقي (الرئيسية)، ومن sm وطالع بيرجع كارت عادي */
  row?: boolean;
}

/**
 * الضغط على الكارت بيفتح صفحة التلاوة، وزرار التشغيل بيشغّلها مكانها.
 * الرابط ممدود على الكارت كله، والمحتوى فوقه مش بيستقبل ضغطات (pointer-events-none)
 * إلا زرار التشغيل والقلب.
 */
export function RecordingCard({
  recording,
  position,
  badge,
  isCurrent,
  isPlaying,
  onPlay,
  favorite = false,
  onToggleFavorite,
  listened = false,
  row = false,
}: Props) {
  const unavailable = !isPlayable(recording);
  const playingNow = isCurrent && isPlaying;
  const progress = useProgressRatio(recording.id);
  const details = [formatDate(recording.date), formatDuration(recording.durationSec)].filter(Boolean);
  // صور يوتيوب 16:9 (شرايطها السودا بتتقص مع object-cover)، والأغلفة المولّدة تفضل مربعة
  const wide = !!recording.imageUrl;
  const playLabel = unavailable ? `${recording.title}: غير متاح بعد` : `${playingNow ? "إيقاف" : "تشغيل"} ${recording.title}`;

  return (
    <li
      className={`group relative flex min-w-0 gap-3 rounded-3xl p-2 transition-colors ${
        row ? "flex-row items-center sm:flex-col sm:items-stretch" : "flex-col"
      } ${isCurrent ? "bg-white/[0.07] ring-1 ring-inset ring-gold/40" : "hover:bg-white/5"}`}
    >
      <Link href={`/${recording.category}/${recording.id}`} aria-label={recording.title} className="absolute inset-0 rounded-3xl" />

      <span
        className={`pointer-events-none relative block shrink-0 overflow-hidden ${wide ? "aspect-video" : "aspect-square"} ${
          row ? "w-[120px] rounded-xl sm:w-full sm:rounded-2xl" : "w-full rounded-2xl"
        }`}
      >
        <RecordingCover
          recording={recording}
          size="lg"
          label={position != null ? toArabicDigits(position) : undefined}
          sizes="(min-width: 1024px) 260px, (min-width: 640px) 30vw, 45vw"
          className="h-full w-full"
        />
        {/* تعتيم خفيف يهدّي الكلام المحروق في صور يوتيوب ويوضّح الأزرار */}
        {wide && <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/10 to-ink/20" />}
        {badge && (
          <span className={`absolute start-2 top-2 rounded-full bg-ink/75 px-2.5 py-1 text-xs font-medium text-gold-soft ${row ? "hidden sm:inline" : ""}`}>
            {badge}
          </span>
        )}
        {listened && (
          <span className={`absolute start-2 top-2 items-center gap-1 rounded-full bg-ink/80 px-2.5 py-1 text-xs font-medium text-gold-soft ${row ? "hidden sm:flex" : "flex"}`}>
            ✓ سمعتها
          </span>
        )}
          {/* شريط التقدّم لو بدأها ومكمّلهاش */}
        {progress > 0 && (
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-white/15">
            <span className="block h-full bg-gold" style={{ width: `${Math.round(progress * 100)}%` }} />
          </span>
        )}
        {playingNow && (
          <span className="absolute inset-0 flex items-center justify-center bg-ink/50">
            <EqualizerIcon className={`text-gold ${row ? "h-6 w-6 sm:h-9 sm:w-9" : "h-9 w-9"}`} />
          </span>
        )}

        <button
          type="button"
          onClick={onPlay}
          disabled={unavailable}
          aria-label={playLabel}
          className={`pointer-events-auto absolute bottom-2 end-2 h-12 w-12 items-center justify-center rounded-full shadow-float transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            row ? "hidden sm:flex" : "flex"
          } ${isCurrent ? "bg-gold text-gold-ink" : "bg-ink/80 text-text hover:bg-gold hover:text-gold-ink"}`}
        >
          {playingNow ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
        </button>

        {onToggleFavorite && (
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-pressed={favorite}
            aria-label={`${favorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}: ${recording.title}`}
            className={`pointer-events-auto absolute end-2 top-2 h-10 w-10 items-center justify-center rounded-full bg-ink/75 transition-colors hover:bg-ink ${
              row ? "hidden sm:flex" : "flex"
            } ${favorite ? "text-[#E5636B]" : "text-text/80 hover:text-text"}`}
          >
            <HeartIcon filled={favorite} className="h-[18px] w-[18px]" />
          </button>
        )}
      </span>

      <span className="pointer-events-none relative flex min-w-0 flex-1 flex-col gap-1 px-1 pb-1">
        <span
          className={`line-clamp-2 text-[15px] font-semibold leading-6 sm:text-base ${
            isCurrent ? "text-gold-soft" : "group-hover:text-gold-soft"
          }`}
        >
          {recording.title}
        </span>
        {/* الوصف هو اللي بيفرّق بين التسجيلات اللي عناوينها متشابهة، فبياخد سطرين كاملين */}
        {recording.subtitle && (
          <span className="line-clamp-2 text-[13px] leading-[1.6] text-muted">{recording.subtitle}</span>
        )}
        {details.length > 0 && (
          <span className={`truncate text-xs text-muted/80 ${row ? "hidden sm:block" : ""}`}>{details.join(" · ")}</span>
        )}
      </span>

      {/* زرار التشغيل في الصف (الموبايل بس) */}
      {row && (
        <button
          type="button"
          onClick={onPlay}
          disabled={unavailable}
          aria-label={playLabel}
          className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-40 sm:hidden ${
            isCurrent ? "border-gold bg-gold text-gold-ink" : "border-gold/50 text-gold"
          }`}
        >
          {playingNow ? <PauseIcon className="h-[18px] w-[18px]" /> : <PlayIcon className="h-[18px] w-[18px]" />}
        </button>
      )}
    </li>
  );
}