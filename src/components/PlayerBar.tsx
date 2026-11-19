"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatDuration, toArabicDigits } from "@/lib/format";
import { getCategory } from "@/lib/categories";
import { isPlayable } from "@/lib/labels";
import { useFavorites } from "@/lib/useFavorites";
import { SLEEP_OPTIONS, usePlayer } from "./PlayerProvider";
import { FullscreenPlayer } from "./FullscreenPlayer";
import { DownloadIcon, PlayerMenu, RepeatIcon, ShareIcon, usePlayerActions } from "./PlayerMore";
import { RecordingCover } from "./RecordingCover";
import {
  HeartIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  TimerIcon,
  VolumeIcon,
} from "./icons";

const iconBtn =
  "relative flex h-11 w-11 items-center justify-center rounded-full text-text transition-colors hover:bg-fg/5 hover:text-gold-soft disabled:opacity-30 disabled:hover:bg-transparent";

export function PlayerBar() {
  const p = usePlayer();
  const fav = useFavorites();
  const act = usePlayerActions(p.current);
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
      onClick={(e) => {
        // الضغط على أي حتة في الشريط بيفتح المشغّل الكبير، ما عدا الأزرار والروابط وشريط التقدّم
        if (p.current?.youtubeId) return;
        if ((e.target as HTMLElement).closest("button, a, input, [role=menu]")) return;
        setFull(true);
      }}
      className={`glass fixed inset-x-0 bottom-0 z-40 border-t border-fg/10 pb-[env(safe-area-inset-bottom)] ${p.current.youtubeId ? "" : "cursor-pointer"}`}
    >
      {/* خط التقدّم للموبايل */}
      <div aria-hidden dir="ltr" className="absolute inset-x-0 top-0 h-[2px] bg-fg/5 md:hidden">
        <div className="h-full bg-accent transition-[width] duration-200" style={{ width: `${pct}%` }} />
      </div>

      {/*
        موبايل: الغلاف والعنوان (بيفتحوا المشغّل الكبير)، والمفضلة، والتشغيل، والتالي.
        ديسكتوب (زي أنغامي): التسجيل وأدواته | التحكم والتقدّم في النص | الصوت وملء الشاشة
      */}
      <div className="mx-auto grid max-w-page grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 sm:px-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)] md:gap-6">
        {/* التسجيل */}
        <div className="flex min-w-0 items-center gap-1">
          {p.current.youtubeId ? (
            <RecordingCover recording={p.current} sizes="48px" className="me-2 h-12 w-12 shrink-0 rounded-xl border border-gold/30" />
          ) : (
            <button type="button" onClick={() => setFull(true)} aria-label="فتح المشغّل بملء الشاشة" className="me-2 shrink-0 rounded-xl">
              <RecordingCover recording={p.current} sizes="48px" className="h-12 w-12 rounded-xl border border-gold/30" />
            </button>
          )}
          <span className="flex min-w-0 flex-1 flex-col">
            {p.current.youtubeId ? (
              <Link href={`/${p.current.category}/${p.current.id}`} className="truncate text-[15px] font-semibold hover:text-gold-soft">
                {p.current.title}
              </Link>
            ) : (
              <span className="truncate text-[15px] font-semibold">{p.current.title}</span>
            )}
            <span className={`truncate text-xs ${p.error || act.note ? "text-gold-soft" : "text-muted"}`}>{p.error ?? (act.note || section)}</span>
          </span>
          <button
            type="button"
            onClick={() => p.current && fav.toggle(p.current.id)}
            aria-pressed={favorite}
            aria-label={favorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
            className={`${iconBtn} ${favorite ? "!text-[#E5636B]" : ""}`}
          >
            <HeartIcon filled={favorite} className="h-5 w-5" />
          </button>
          {act.canOffline && (
            <button
              type="button"
              onClick={act.toggleOffline}
              disabled={act.saving !== null}
              aria-label={act.saved ? "محفوظة من غير نت (اضغط للمسح)" : "حفظ من غير نت"}
              title={act.saving !== null ? `${Math.round(act.saving)}%` : undefined}
              className={`${iconBtn} hidden md:flex ${act.saved ? "!text-gold" : ""}`}
            >
              <DownloadIcon done={act.saved} />
            </button>
          )}
          <button type="button" onClick={act.share} aria-label="مشاركة" className={`${iconBtn} hidden md:flex`}>
            <ShareIcon />
          </button>
          <PlayerMenu variant="popover" className="hidden md:block" />
        </div>

        {/* التحكم: الأزرار فوق، والتقدّم تحتها (ديسكتوب) */}
        <div className="flex flex-col items-center gap-1">
          <div dir="ltr" className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => p.setRepeat(p.repeat > 0 ? 0 : Infinity)}
              aria-pressed={p.repeat > 0}
              aria-label={p.repeat > 0 ? "إيقاف التكرار" : "تكرار التلاوة"}
              className={`${iconBtn} hidden md:flex ${p.repeat > 0 ? "!text-gold" : ""}`}
            >
              <RepeatIcon />
            </button>
            <button type="button" onClick={p.prev} aria-label="السابق" className={`${iconBtn} hidden md:flex`}>
              <PrevIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={p.toggle}
              disabled={!isPlayable(p.current)}
              aria-label={p.isPlaying ? "إيقاف مؤقت" : "تشغيل"}
              className="mx-1 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-40"
            >
              {p.isPlaying ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
            </button>
            <button type="button" onClick={p.next} disabled={atEnd} aria-label="التالي" className={iconBtn}>
              <NextIcon className="h-5 w-5" />
            </button>
            {/* تايمر الإيقاف */}
            <div ref={sleepRef} className="relative hidden md:block">
              <button
                type="button"
                onClick={() => setSleepOpen((o) => !o)}
                aria-expanded={sleepOpen}
                aria-haspopup="true"
                aria-label="تايمر الإيقاف"
                className={`${iconBtn} ${p.sleep ? "!text-gold" : ""}`}
              >
                <TimerIcon className="h-5 w-5" />
                {sleepBadge && (
                  <span className="absolute -bottom-0.5 rounded-full bg-accent px-1 text-[10px] font-bold leading-4 text-accent-ink">{sleepBadge}</span>
                )}
              </button>
              {sleepOpen && (
                <div dir="rtl" className="absolute bottom-full left-1/2 mb-3 w-48 -translate-x-1/2 rounded-2xl border border-fg/10 bg-raised p-1.5 shadow-float">
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
          </div>
          <div dir="ltr" className="hidden w-full items-center gap-3 text-xs text-muted md:flex">
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
        </div>

        {/* الصوت وملء الشاشة (ديسكتوب) */}
        <div className="hidden items-center justify-end gap-1 md:flex">
          <button type="button" onClick={p.toggleMute} aria-label={p.muted ? "تشغيل الصوت" : "كتم الصوت"} aria-pressed={p.muted} className={iconBtn}>
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
            className="progress hidden w-24 lg:block"
            style={{ "--pct": `${(p.muted ? 0 : p.volume) * 100}%` } as React.CSSProperties}
          />
          {!p.current.youtubeId && (
            <button type="button" onClick={() => setFull(true)} aria-label="المشغّل بملء الشاشة" className={iconBtn}>
              <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
              </svg>
            </button>
          )}
        </div>
      </div>
            {full && !p.current.youtubeId && <FullscreenPlayer onClose={() => setFull(false)} />}
    </div>
  );
}