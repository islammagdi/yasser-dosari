"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatDuration, toArabicDigits } from "@/lib/format";
import { getCategory } from "@/lib/categories";
import { isPlayable } from "@/lib/labels";
import { useFavorites } from "@/lib/useFavorites";
import { PLAYBACK_RATES, usePlayer } from "./PlayerProvider";
import { FullscreenPlayer } from "./FullscreenPlayer";
import { RecordingCover } from "./RecordingCover";
import {
  Forward10Icon,
  GaugeIcon,
  HeartIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  Replay10Icon,
  TimerIcon,
  VolumeIcon,
} from "./icons";

const SLEEP_OPTIONS: { value: number | "end"; label: string }[] = [
  { value: 15, label: "بعد ١٥ دقيقة" },
  { value: 30, label: "بعد ٣٠ دقيقة" },
  { value: 45, label: "بعد ٤٥ دقيقة" },
  { value: 60, label: "بعد ساعة" },
  { value: "end", label: "مع نهاية التلاوة" },
];

const iconBtn =
  "relative flex h-11 w-11 items-center justify-center rounded-full text-text transition-colors hover:bg-fg/5 hover:text-gold-soft disabled:opacity-30 disabled:hover:bg-transparent";

export function PlayerBar() {
  const p = usePlayer();
  const fav = useFavorites();
  const [sleepOpen, setSleepOpen] = useState(false);
  const [full, setFull] = useState(false);
  const sleepRef = useRef<HTMLDivElement>(null);

  // قايمة التايمر بتقفل لو ضغطت براها أو دوست Escape
  useEffect(() => {
    if (!sleepOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!sleepRef.current?.contains(e.target as Node)) setSleepOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSleepOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [sleepOpen]);

  if (!p.current) return null;

  const section = getCategory(p.current.category)?.title ?? "";
  const max = p.duration || 0;
  const pct = max ? (p.currentTime / max) * 100 : 0;
  const atEnd = p.queue.indexOf(p.current) >= p.queue.length - 1;
  const favorite = fav.isFavorite(p.current.id);
  const cycleRate = () => {
    const i = PLAYBACK_RATES.indexOf(p.rate as (typeof PLAYBACK_RATES)[number]);
    p.setRate(PLAYBACK_RATES[(i + 1) % PLAYBACK_RATES.length]);
  };
  const sleepBadge =
    p.sleep?.kind === "minutes"
      ? toArabicDigits(Math.max(1, Math.ceil((p.sleep.until - Date.now()) / 60_000)))
      : p.sleep?.kind === "end"
        ? "∎"
        : "";

  return (
    <div
      role="region"
      aria-label="المشغّل"
      className="glass fixed inset-x-0 bottom-0 z-40 border-t border-fg/10 pb-[env(safe-area-inset-bottom)]"
    >
      {/* خط التقدّم للموبايل */}
      <div aria-hidden dir="ltr" className="absolute inset-x-0 top-0 h-[2px] bg-fg/5 md:hidden">
        <div className="h-full bg-accent transition-[width] duration-200" style={{ width: `${pct}%` }} />
      </div>

      <div className="mx-auto flex max-w-page items-center gap-3 px-4 py-2.5 sm:px-6 md:gap-6">
        {/* العنوان والمفضلة */}
        <div className="flex min-w-0 flex-1 items-center gap-1 md:w-64 md:flex-none lg:w-80">
          {/* الضغط على الغلاف بيفتح وضع ملء الشاشة (للصوت بس: فيديو يوتيوب لازم يفضل ظاهر) */}
          {p.current.youtubeId ? (
            <RecordingCover recording={p.current} sizes="48px" className="me-2 h-12 w-12 shrink-0 rounded-xl border border-gold/30" />
          ) : (
            <button type="button" onClick={() => setFull(true)} aria-label="فتح المشغّل بملء الشاشة" className="me-2 shrink-0 rounded-xl">
              <RecordingCover recording={p.current} sizes="48px" className="h-12 w-12 rounded-xl border border-gold/30" />
            </button>
          )}
          <span className="flex min-w-0 flex-col">
            <Link href={`/${p.current.category}/${p.current.id}`} className="truncate text-[15px] font-semibold hover:text-gold-soft">
              {p.current.title}
            </Link>
            <span className={`truncate text-xs ${p.error ? "text-gold-soft" : "text-muted"}`}>{p.error ?? section}</span>
          </span>
          <button
            type="button"
            onClick={() => p.current && fav.toggle(p.current.id)}
            aria-pressed={favorite}
            aria-label={favorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-fg/5 ${
              favorite ? "text-[#E5636B]" : "text-muted hover:text-text"
            }`}
          >
            <HeartIcon filled={favorite} className="h-5 w-5" />
          </button>
        </div>

        {/* شريط التقدّم */}
        <div dir="ltr" className="hidden min-w-0 flex-1 items-center gap-3 text-xs text-muted md:flex">
          <span className="w-11 text-right tabular-nums">{formatDuration(p.currentTime) || "٠:٠٠"}</span>
          <input
            type="range"
            min={0}
            max={max || 1}
            step={1}
            value={Math.min(p.currentTime, max || 1)}
            onChange={(e) => p.seek(Number(e.target.value))}
            disabled={!max}
            aria-label="التقدّم"
            aria-valuetext={`${formatDuration(p.currentTime)} من ${formatDuration(max)}`}
            className="progress flex-1"
            style={{ "--pct": `${pct}%` } as React.CSSProperties}
          />
          <span className="w-11 tabular-nums">{formatDuration(max) || "٠:٠٠"}</span>
        </div>

        {/* أدوات التحكم: بتفضل LTR زي أي مشغّل */}
        <div dir="ltr" className="flex shrink-0 items-center gap-0.5">
          <button type="button" onClick={cycleRate} aria-label={`سرعة التشغيل ${p.rate}x`} className={`${iconBtn} hidden md:flex`}>
            <GaugeIcon className="h-5 w-5" />
            {p.rate !== 1 && (
              <span className="absolute -bottom-0.5 rounded-full bg-accent px-1 text-[10px] font-bold leading-4 text-accent-ink">
                {p.rate}x
              </span>
            )}
          </button>
          <button type="button" onClick={() => p.skip(-10)} disabled={!max} aria-label="رجوع ١٠ ثواني" className={`${iconBtn} hidden sm:flex`}>
            <Replay10Icon className="h-5 w-5" />
          </button>
<button type="button" onClick={p.prev} aria-label="السابق" className={`${iconBtn} hidden text-gold sm:flex`}>
            <PrevIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={p.toggle}
            disabled={!isPlayable(p.current)}
            aria-label={p.isPlaying ? "إيقاف مؤقت" : "تشغيل"}
            className="mx-1 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-ink shadow-glow transition-colors hover:bg-accent-hover disabled:opacity-40 disabled:shadow-none"
          >
            {p.isPlaying ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
          </button>
          <button type="button" onClick={p.next} disabled={atEnd} aria-label="التالي" className={`${iconBtn} text-gold`}>
            <NextIcon className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => p.skip(10)} disabled={!max} aria-label="تقديم ١٠ ثواني" className={`${iconBtn} hidden sm:flex`}>
            <Forward10Icon className="h-5 w-5" />
          </button>

          {/* تايمر الإيقاف */}
          <div ref={sleepRef} className="relative hidden md:block">
            <button
              type="button"
              onClick={() => setSleepOpen((o) => !o)}
              aria-expanded={sleepOpen}
              aria-haspopup="true"
              aria-label="تايمر الإيقاف"
              className={`${iconBtn} ${p.sleep ? "text-gold" : ""}`}
            >
              <TimerIcon className="h-5 w-5" />
              {sleepBadge && (
                <span className="absolute -bottom-0.5 rounded-full bg-accent px-1 text-[10px] font-bold leading-4 text-accent-ink">
                  {sleepBadge}
                </span>
              )}
            </button>
            {sleepOpen && (
              <div dir="rtl" className="glass-card absolute bottom-full left-1/2 mb-3 w-48 -translate-x-1/2 rounded-2xl p-1.5 shadow-float">
                <p className="px-3 pb-1 pt-2 text-xs text-muted">إيقاف التشغيل</p>
                {SLEEP_OPTIONS.map((o) => (
                  <button
                    key={String(o.value)}
                    type="button"
                    onClick={() => {
                      p.setSleepTimer(o.value);
                      setSleepOpen(false);
                    }}
                    className="flex min-h-10 w-full items-center rounded-xl px-3 text-start text-sm transition-colors hover:bg-fg/5"
                  >
                    {o.label}
                  </button>
                ))}
                {p.sleep && (
                  <button
                    type="button"
                    onClick={() => {
                      p.setSleepTimer(null);
                      setSleepOpen(false);
                    }}
                    className="mt-1 flex min-h-10 w-full items-center rounded-xl border-t border-fg/10 px-3 text-start text-sm text-gold-soft transition-colors hover:bg-fg/5"
                  >
                    إلغاء التايمر
                  </button>
                )}
              </div>
            )}
          </div>

          {/* الصوت */}
          <div className="hidden items-center md:flex">
            <button
              type="button"
              onClick={p.toggleMute}
              aria-label={p.muted ? "تشغيل الصوت" : "كتم الصوت"}
              aria-pressed={p.muted}
              className={`${iconBtn} text-gold`}
            >
              <VolumeIcon muted={p.muted || p.volume === 0} className="h-5 w-5" />
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={p.muted ? 0 : p.volume}
              onChange={(e) => p.setVolume(Number(e.target.value))}
              aria-label="مستوى الصوت"
              className="progress hidden w-20 lg:block"
              style={{ "--pct": `${(p.muted ? 0 : p.volume) * 100}%` } as React.CSSProperties}
            />
          </div>
        </div>
      </div>
            {full && !p.current.youtubeId && <FullscreenPlayer onClose={() => setFull(false)} />}
    </div>
  );
}