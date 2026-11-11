"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
/** مدة الطلوع والنزول (لازم تساوي duration-[420ms] في الكلاسات) */
const SHEET_MS = 420;

export function FullscreenPlayer({ onClose }: { onClose: () => void }) {
  const p = usePlayer();
  const fav = useFavorites();
  const r = p.current;
  const [text, setText] = useState<{ surah: number; ayahs: Ayah[]; timings: AyahTiming[] } | null>(null);

  // حركة الطلوع والنزول: بيترسم تحت الشاشة، وفي الفريم اللي بعده بيطلع لفوق
  const sheetRef = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  const closing = useRef(false);
  useEffect(() => {
    let id = requestAnimationFrame(() => {
      id = requestAnimationFrame(() => setShown(true));
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // القفل: بينزل الأول، وبعد ما الحركة تخلص بيتشال فعلًا
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const requestClose = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    const el = sheetRef.current;
    if (el) {
      el.style.transition = "";
      el.style.transform = "";
    }
    setShown(false);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => closeRef.current(), reduce ? 0 : SHEET_MS);
  }, []);

  // السحب لتحت بيقفل (لو الشاشة مش متسكرولة)، والسحب القصير بيرجع مكانه
  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    let startY = 0, startX = 0, t0 = 0, dy = 0;
    let tracking = false, dragging = false;
    const start = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      tracking = e.touches.length === 1 && el.scrollTop <= 0 && !target.closest("input, [data-no-drag]");
      dragging = false;
      if (!tracking) return;
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
      t0 = Date.now();
    };
    const move = (e: TouchEvent) => {
      if (!tracking) return;
      dy = e.touches[0].clientY - startY;
      const dx = Math.abs(e.touches[0].clientX - startX);
      if (!dragging) {
        if (dy < 0 || dx > Math.abs(dy)) { tracking = false; return; } // سكرول لفوق أو سحب بالعرض
        if (dy < 8) return;
        dragging = true;
      }
      e.preventDefault();
      el.style.transition = "none";
      el.style.transform = `translate3d(0, ${Math.max(0, dy - 8)}px, 0)`;
    };
    const end = () => {
      if (!dragging) { tracking = false; return; }
      tracking = dragging = false;
      const speed = dy / Math.max(1, Date.now() - t0); // بكسل لكل ملي ثانية
      if (dy > 140 || speed > 0.6) requestClose();
      else {
        el.style.transition = "";
        el.style.transform = "";
      }
    };
    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", end);
    el.addEventListener("touchcancel", end);
    return () => {
      el.removeEventListener("touchstart", start);
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchend", end);
      el.removeEventListener("touchcancel", end);
    };
  }, [requestClose]);

  // Escape بيقفل، والصفحة اللي ورا متتحركش
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && requestClose();
    document.addEventListener("keydown", esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = prev;
    };
  }, [requestClose]);

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
  // أزرار التقديم والتأخير: بإطار ذهبي عشان تبان
  const skipBtn = "flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 bg-white/5 text-gold-soft transition-colors hover:bg-gold/10 disabled:opacity-30";
  const REPEATS = [0, 2, 3, 5, Infinity];
  const cycleRepeat = () => p.setRepeat(REPEATS[(REPEATS.indexOf(p.repeat) + 1) % REPEATS.length]);
  const repeatLabel =
    p.repeat === 0 ? "تكرار" : p.repeat === Infinity ? "تكرار بلا حد" : p.repeat === 2 ? "تكرار مرتين" : `تكرار ${toArabicDigits(p.repeat)} مرات`;

  // بيترسم في body مباشرة: المشغّل اللي تحت عليه blur، وده بيحبس أي عنصر fixed جواه في حدوده
  return createPortal(
    <>
    {/* تعتيم خفيف ورا الشاشة وهي طالعة ونازلة */}
    <div
      aria-hidden
      onClick={requestClose}
      className={`fixed inset-0 z-[59] bg-black/60 transition-opacity duration-[420ms] motion-reduce:transition-none ${shown ? "opacity-100" : "pointer-events-none opacity-0"}`}
    />
    <div
      ref={sheetRef}
      role="dialog"
      aria-modal="true"
      aria-label="المشغّل بملء الشاشة"
      className={`fixed inset-0 z-[60] flex flex-col overflow-y-auto overscroll-contain bg-ink transition-transform duration-[420ms] ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform motion-reduce:transition-none ${
        shown ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div aria-hidden className="ambient" />
      <div className="flex items-center justify-between px-4 py-3">
        <button type="button" onClick={requestClose} aria-label="إغلاق ملء الشاشة" className={`${big} h-12 w-12`}>
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
          <Link href={`/${r.category}/${r.id}`} onClick={requestClose} className="font-display text-2xl font-bold leading-snug hover:text-gold-soft sm:text-3xl">
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
          <button type="button" onClick={() => p.skip(-10)} disabled={!max} aria-label="رجوع ١٠ ثواني" className={skipBtn}>
            <SkipIcon dir={-1} />
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
          <button type="button" onClick={() => p.skip(10)} disabled={!max} aria-label="تقديم ١٠ ثواني" className={skipBtn}>
            <SkipIcon dir={1} />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={cycleRate} aria-label={`سرعة التشغيل ${p.rate}x`} className="min-h-11 rounded-full border border-line-strong px-5 text-sm font-semibold text-gold-soft">
            السرعة {toArabicDigits(p.rate)}×
          </button>
          {/* التكرار: كل ضغطة بتغيّر العدد (مرتين، ٣، ٥، بلا حد، إيقاف) */}
          <button
            type="button"
            onClick={cycleRepeat}
            aria-pressed={p.repeat > 0}
            aria-label={`تكرار التلاوة: ${repeatLabel}`}
            className={`flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors ${
              p.repeat > 0 ? "bg-gold text-gold-ink" : "border border-line-strong text-gold-soft"
            }`}
          >
            <RepeatIcon />
            {repeatLabel}
          </button>
        </div>
        {p.repeat > 0 && p.repeat !== Infinity && (
          <p className="-mt-3 text-xs text-muted">باقي {toArabicDigits(p.repeatLeft)} {p.repeatLeft === 1 ? "مرة" : "مرات"} بعد هذه</p>
        )}
      </div>
    </div>
    </>,
    document.body,
  );
}

/** سهم دايري ورقم ١٠ جواه: dir = -1 رجوع، 1 تقديم */
function SkipIcon({ dir }: { dir: -1 | 1 }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <g transform={dir === 1 ? "translate(24 0) scale(-1 1)" : undefined}>
        <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
        <path d="M4 3.5v4h4" />
      </g>
      <text x="12" y="15.2" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="currentColor" stroke="none" fontFamily="system-ui, sans-serif">
        10
      </text>
    </svg>
  );
}

function RepeatIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </svg>
  );
}
