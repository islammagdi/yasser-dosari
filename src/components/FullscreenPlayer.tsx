"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Ayah, AyahTiming } from "@/lib/api/quranText";
import { getCategory } from "@/lib/categories";
import { formatDuration, toArabicDigits } from "@/lib/format";
import { useFavorites } from "@/lib/useFavorites";
import { PLAYBACK_RATES, usePlayer } from "./PlayerProvider";
import { RecordingCover } from "./RecordingCover";
import { HeartIcon, NextIcon, PauseIcon, PlayIcon, PrevIcon } from "./icons";

/**
 * وضع الاستماع بملء الشاشة: غلاف كبير وأزرار كبيرة، ونص الآية الحالية في سور المصحف.
 * مناسب للسواقة وكبار السن والاستماع مع العيلة. (للصوت بس؛ فيديو يوتيوب لازم يفضل ظاهر)
 */
export function FullscreenPlayer({ onClose }: { onClose: () => void }) {
  const p = usePlayer();
  const fav = useFavorites();
  const r = p.current;
  const [text, setText] = useState<{ surah: number; ayahs: Ayah[]; timings: AyahTiming[] } | null>(null);

  // Escape بيقفل، والصفحة اللي ورا متتحركش
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    document.addEventListener("keydown", esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = prev;
    };
  }, []);

  // نص السورة وتوقيتها: لسور المصحف الصوتية بس (التوقيت متاح لتلاوة mp3quran)
  const surah = r?.category === "mushaf" && r.surah && r.audioUrl.includes("mp3quran") ? r.surah : null;
  useEffect(() => {
    if (!surah || text?.surah === surah) return;
    let alive = true;
    fetch(`/api/ayahs/${surah}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => alive && d?.ayahs && setText({ surah, ayahs: d.ayahs, timings: d.timings ?? [] }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [surah, text?.surah]);

  const ms = p.currentTime * 1000;
  const current = useMemo(() => {
    if (!text || text.surah !== surah || !text.timings.length) return null;
    const t = text.timings.find((x) => ms >= x.start && ms < x.end);
    return t && t.ayah > 0 ? text.ayahs.find((a) => a.n === t.ayah) ?? null : null;
  }, [text, surah, ms]);

  if (!r) return null;

  const max = p.duration || 0;
  const pct = max ? (p.currentTime / max) * 100 : 0;
  const atEnd = p.queue.indexOf(r) >= p.queue.length - 1;
  const favorite = fav.isFavorite(r.id);
  const cycleRate = () => {
    const i = PLAYBACK_RATES.indexOf(p.rate as (typeof PLAYBACK_RATES)[number]);
    p.setRate(PLAYBACK_RATES[(i + 1) % PLAYBACK_RATES.length]);
  };
  const big = "flex items-center justify-center rounded-full text-text transition-colors hover:bg-white/10 disabled:opacity-30";

  // بيترسم في body مباشرة: المشغّل اللي تحت عليه blur، وده بيحبس أي عنصر fixed جواه في حدوده
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="المشغّل بملء الشاشة"
      className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-ink"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div aria-hidden className="ambient" />
      <div className="flex items-center justify-between px-4 py-3">
        <button type="button" onClick={onClose} aria-label="إغلاق ملء الشاشة" className={`${big} h-12 w-12`}>
          <svg aria-hidden viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        <span className="text-sm text-muted">{getCategory(r.category)?.title}</span>
        <button
          type="button"
          onClick={() => fav.toggle(r.id)}
          aria-pressed={favorite}
          aria-label={favorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
          className={`${big} h-12 w-12 ${favorite ? "text-[#E5636B]" : "text-muted"}`}
        >
          <HeartIcon filled={favorite} className="h-6 w-6" />
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 px-6 pb-6">
        {current ? (
          // الآية اللي بتتقري دلوقتي مكان الغلاف
          <p key={current.n} className="rise text-center font-quran text-3xl leading-[2.1] sm:text-4xl">
            {current.text} <span className="text-gold/80">﴿{toArabicDigits(current.n)}﴾</span>
          </p>
        ) : (
          <RecordingCover recording={r} sizes="320px" size="lg" className="aspect-square w-[min(70vw,320px)] rounded-3xl shadow-float" />
        )}

        <div className="flex w-full flex-col items-center gap-1 text-center">
          <Link href={`/${r.category}/${r.id}`} onClick={onClose} className="font-display text-2xl font-bold leading-snug hover:text-gold-soft sm:text-3xl">
            {r.title || r.prayerLabel}
          </Link>
          {r.subtitle && <p className="line-clamp-2 text-muted">{r.subtitle}</p>}
          {p.error && <p className="text-sm text-gold-soft">{p.error}</p>}
        </div>

        {/* التقدّم */}
        <div dir="ltr" className="flex w-full flex-col gap-2">
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
            className="progress w-full"
            style={{ "--pct": `${pct}%`, height: "6px" } as React.CSSProperties}
          />
          <div className="flex justify-between text-sm tabular-nums text-muted">
            <span>{formatDuration(p.currentTime) || "٠:٠٠"}</span>
            <span>{formatDuration(max) || "٠:٠٠"}</span>
          </div>
        </div>

        {/* الأزرار: كبيرة عشان تتضغط بسهولة */}
        <div dir="ltr" className="flex items-center justify-center gap-2 sm:gap-4">
          <button type="button" onClick={() => p.skip(-10)} disabled={!max} aria-label="رجوع ١٠ ثواني" className={`${big} h-14 w-14 text-sm font-semibold`}>
            -١٠
          </button>
          <button type="button" onClick={p.prev} aria-label="السابق" className={`${big} h-16 w-16 text-gold`}>
            <PrevIcon className="h-8 w-8" />
          </button>
          <button
            type="button"
            onClick={p.toggle}
            aria-label={p.isPlaying ? "إيقاف مؤقت" : "تشغيل"}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-gold text-gold-ink shadow-glow transition-colors hover:bg-gold-soft"
          >
            {p.isPlaying ? <PauseIcon className="h-9 w-9" /> : <PlayIcon className="h-9 w-9" />}
          </button>
          <button type="button" onClick={p.next} disabled={atEnd} aria-label="التالي" className={`${big} h-16 w-16 text-gold`}>
            <NextIcon className="h-8 w-8" />
          </button>
          <button type="button" onClick={() => p.skip(10)} disabled={!max} aria-label="تقديم ١٠ ثواني" className={`${big} h-14 w-14 text-sm font-semibold`}>
            +١٠
          </button>
        </div>

        <button type="button" onClick={cycleRate} aria-label={`سرعة التشغيل ${p.rate}x`} className="min-h-11 rounded-full border border-line-strong px-5 text-sm font-semibold text-gold-soft">
          السرعة {toArabicDigits(p.rate)}×
        </button>
      </div>
    </div>,
    document.body,
  );
}
