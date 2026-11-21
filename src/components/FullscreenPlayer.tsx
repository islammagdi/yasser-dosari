"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Ayah, AyahTiming } from "@/lib/api/quranText";
import { formatDuration, toArabicDigits } from "@/lib/format";
import { useFavorites } from "@/lib/useFavorites";
import { PlayerQueue } from "./PlayerQueue";
import { DownloadIcon, PlayerMenu, ShareIcon, usePlayerActions } from "./PlayerMore";
import { SLEEP_OPTIONS, usePlayer } from "./PlayerProvider";
import { RecordingCover } from "./RecordingCover";
import { HeartIcon, NextIcon, PauseIcon, PlayIcon } from "./icons";

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
  const act = usePlayerActions(r);
  const [sleepOpen, setSleepOpen] = useState(false);

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
  const big = "flex items-center justify-center rounded-full text-text transition-colors hover:bg-fg/10 disabled:opacity-30";
  // أزرار التقديم والتأخير: بإطار ذهبي عشان تبان
  const skipBtn = "flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 bg-fg/5 text-gold-soft transition-colors hover:bg-gold/10 disabled:opacity-30";
  // الصف اللي تحت (زي أنغامي): أيقونة وجنبها كلمة صغيرة
  const tool = "flex min-h-11 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold text-muted transition-colors hover:bg-fg/5 hover:text-text disabled:opacity-30";

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
      className={`fixed inset-0 z-[60] flex h-[100dvh] flex-col overflow-hidden bg-ink transition-transform duration-[420ms] ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform motion-reduce:transition-none ${
        shown ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div aria-hidden className="ambient" />
      <div className="flex shrink-0 items-center px-3 pt-2">
        <button type="button" onClick={requestClose} aria-label="إغلاق ملء الشاشة" className={`${big} h-12 w-12`}>
          <svg aria-hidden viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      {/* المساحة كلها بتتوزع على الشاشة من غير سكرول (الغلاف بيصغر في الشاشات القصيرة) */}
      <div className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col justify-evenly gap-3 px-6 pb-3">
        <div className="flex min-h-0 flex-1 items-center justify-center">
          {current ? (
            // الآية اللي بتتقري دلوقتي مكان الغلاف
            <p key={current.n} className="rise text-center font-quran text-3xl leading-[2.1] sm:text-4xl">
              {current.text} <span className="text-gold/80">﴿{toArabicDigits(current.n)}﴾</span>
            </p>
          ) : (
            <RecordingCover
              recording={r}
              sizes="380px"
              size="lg"
              className="aspect-square w-[min(80vw,42dvh,380px)] rounded-3xl shadow-soft"
            />
          )}
        </div>

        {/* العنوان على اليمين، والمشاركة والمزيد على الشمال (زي أنغامي). الضغط على العنوان بيفتح صفحة التلاوة */}
        <div className="flex w-full shrink-0 items-center gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <Link href={`/${r.category}/${r.id}`} onClick={requestClose} className="line-clamp-2 font-display text-2xl font-bold leading-snug hover:text-gold-soft">
              {r.title || r.prayerLabel}
            </Link>
            {r.subtitle && <p className="truncate text-sm text-muted">{r.subtitle}</p>}
            {(p.error || act.note) && <p className="text-sm text-gold-soft">{p.error ?? act.note}</p>}
          </div>
          <button type="button" onClick={act.share} aria-label="مشاركة" className={`${big} h-11 w-11 shrink-0 bg-fg/5 text-muted`}>
            <ShareIcon />
          </button>
          <PlayerMenu variant="sheet" onNavigate={requestClose} className="shrink-0" />
        </div>

        {/* التقدّم */}
        <div dir="ltr" className="flex w-full shrink-0 flex-col gap-1.5">
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

        {/* الأزرار: المفضلة على الطرف زي أنغامي، وبعدين رجوع وتشغيل وتقديم والتالي */}
        <div dir="ltr" className="flex shrink-0 items-center justify-between">
          <button
            type="button"
            onClick={() => fav.toggle(r.id)}
            aria-pressed={favorite}
            aria-label={favorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
            className={`${big} h-12 w-12 ${favorite ? "text-[#E5636B]" : "text-muted"}`}
          >
            <HeartIcon filled={favorite} className="h-6 w-6" />
          </button>
          <button type="button" onClick={() => p.skip(-10)} disabled={!max} aria-label="رجوع ١٠ ثواني" className={skipBtn}>
            <SkipIcon dir={-1} />
          </button>
          <button
            type="button"
            onClick={p.toggle}
            aria-label={p.isPlaying ? "إيقاف مؤقت" : "تشغيل"}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-accent text-accent-ink transition-colors hover:bg-accent-hover"
          >
            {p.isPlaying ? <PauseIcon className="h-9 w-9" /> : <PlayIcon className="h-9 w-9" />}
          </button>
          <button type="button" onClick={() => p.skip(10)} disabled={!max} aria-label="تقديم ١٠ ثواني" className={skipBtn}>
            <SkipIcon dir={1} />
          </button>
          <button type="button" onClick={p.next} disabled={atEnd} aria-label="التالي" className={`${big} h-12 w-12 text-gold`}>
            <NextIcon className="h-7 w-7" />
          </button>
        </div>

        {/* الصف اللي تحت: التايمر، وقايمة الاستماع (التالي)، والتحميل. الإضافة لقايمة تشغيل في ⋮ */}
        <div className="flex shrink-0 items-center justify-between">
          <div className="relative">
            <button type="button" onClick={() => setSleepOpen((o) => !o)} aria-expanded={sleepOpen} className={`${tool} ${p.sleep ? "text-gold" : ""}`}>
              <span className="text-sm font-bold">zZ</span>
              {p.sleep ? "شغال" : "إيقاف بعد"}
            </button>
            {sleepOpen && (
              <div role="menu" className="absolute bottom-full start-0 z-10 mb-2 w-48 rounded-2xl border border-fg/10 bg-raised p-1.5 shadow-float">
                {SLEEP_OPTIONS.map((o) => (
                  <button
                    key={String(o.value)}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      p.setSleepTimer(o.value);
                      setSleepOpen(false);
                    }}
                    className="flex min-h-10 w-full items-center rounded-xl px-3 text-start text-sm hover:bg-fg/5"
                  >
                    {o.label}
                  </button>
                ))}
                {p.sleep && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      p.setSleepTimer(null);
                      setSleepOpen(false);
                    }}
                    className="mt-1 flex min-h-10 w-full items-center rounded-xl border-t border-fg/10 px-3 text-start text-sm text-gold-soft hover:bg-fg/5"
                  >
                    إلغاء التايمر
                  </button>
                )}
              </div>
            )}
          </div>
          <PlayerQueue className={tool} />
          {act.canOffline && (
            <button type="button" onClick={act.toggleOffline} disabled={act.saving !== null} className={`${tool} ${act.saved ? "text-gold" : ""}`}>
              <DownloadIcon done={act.saved} />
              {act.saving !== null ? `${toArabicDigits(Math.round(act.saving))}٪` : act.saved ? "محفوظة" : "من غير نت"}
            </button>
          )}
        </div>
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
