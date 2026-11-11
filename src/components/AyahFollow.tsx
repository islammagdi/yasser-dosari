"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Recording } from "@/types";
import type { Ayah, AyahTiming } from "@/lib/api/quranText";
import { toArabicDigits } from "@/lib/format";
import { usePlayer } from "./PlayerProvider";

const selectClass = "min-h-11 rounded-xl border border-white/10 bg-surface px-3 text-text";

const BASMALA = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";

/** نص السورة مع تلوين الآية اللي بتتقري، والضغط على آية بيوديك لها في التلاوة */
export function AyahFollow({
  recording,
  ayahs,
  basmala,
  timings,
  initialFrom,
  initialTo,
}: {
  recording: Recording;
  ayahs: Ayah[];
  basmala: boolean;
  timings: AyahTiming[];
  /** من رابط "استمع وكرّر" في صفحة القراءة */
  initialFrom?: number;
  initialTo?: number;
}) {
  const p = usePlayer();
  const [follow, setFollow] = useState(true);
  const refs = useRef(new Map<number, HTMLElement>());
  const isCurrent = p.current?.id === recording.id;
  const ms = isCurrent ? p.currentTime * 1000 : -1;

  // الآية الحالية: 0 = البسملة أو ما قبل أول آية
  const active = useMemo(() => {
    if (ms < 0) return null;
    const t = timings.find((x) => ms >= x.start && ms < x.end);
    return t ? t.ayah : null;
  }, [ms, timings]);

  // الصفحة بتنزل مع الآية وهي بتتقري
  useEffect(() => {
    if (!follow || !p.isPlaying || active == null) return;
    refs.current.get(active)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [active, follow, p.isPlaying]);

  const jump = (ayah: number) => {
    const t = timings.find((x) => x.ayah === ayah);
    if (!t) return;
    const sec = t.start / 1000;
    if (isCurrent) {
      p.seek(sec);
      if (!p.isPlaying) p.toggle();
    } else {
      p.playQueue([recording], 0, sec);
    }
  };

  // ===== التكرار: من آية لآية، عدد مرات معيّن =====
  const timed = useMemo(() => timings.filter((t) => t.ayah >= 1).sort((a, b) => a.ayah - b.ayah), [timings]);
  const timingOf = (n: number) => timed.find((t) => t.ayah === n);
  const clampAyah = (n: number | undefined, fallback: number) =>
    n && timed.some((t) => t.ayah === n) ? n : fallback;
  const firstAyah = timed[0]?.ayah ?? 1;
  const [from, setFrom] = useState(() => clampAyah(initialFrom, firstAyah));
  const [to, setTo] = useState(() => clampAyah(initialTo ?? initialFrom, firstAyah));
  const [times, setTimes] = useState(3); // 0 = بلا توقف
  // رابط "شارك المقطع" (?from=&to=): بيتقري في المتصفح
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const f = Number(q.get("from")) || undefined;
    const t = Number(q.get("to")) || undefined;
    if (!f) return;
    setFrom(clampAyah(f, firstAyah));
    setTo(clampAyah(t ?? f, firstAyah));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [repeat, setRepeat] = useState<{ round: number } | null>(null);
  const guard = useRef(0);

  const startRepeat = () => {
    const a = timingOf(from);
    if (!a || !timingOf(to)) return;
    guard.current = Date.now();
    setRepeat({ round: 1 });
    setFollow(true);
    const sec = a.start / 1000;
    if (isCurrent) {
      p.seek(sec);
      if (!p.isPlaying) p.toggle();
    } else {
      p.playQueue([recording], 0, sec);
    }
  };

  const stopRepeat = () => setRepeat(null);

  useEffect(() => {
    if (!repeat || !isCurrent || ms < 0) return;
    if (Date.now() - guard.current < 800) return; // الوقت لسه متحدّثش بعد الـ seek
    const a = timingOf(from);
    const b = timingOf(to);
    if (!a || !b) return setRepeat(null);
    // الزائر نقل بنفسه لمكان برّه المقطع: نوقّف التكرار
    if (ms < a.start - 1500 || ms > b.end + 3000) return setRepeat(null);
    if (ms < b.end - 150) return;
    if (times === 0 || repeat.round < times) {
      guard.current = Date.now();
      setRepeat({ round: repeat.round + 1 });
      p.seek(a.start / 1000);
    } else {
      setRepeat(null);
      if (p.isPlaying) p.toggle();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms]);

  const setRef = (n: number) =>(el: HTMLElement | null) => {
    if (el) refs.current.set(n, el);
    else refs.current.delete(n);
  };

  const hasTimings = timings.length > 0;
  const ayahClass = (n: number) =>
    `rounded-lg transition-colors ${active === n ? "bg-gold/20 text-gold-soft" : ""} ${
      hasTimings ? "cursor-pointer hover:text-gold-soft" : ""
    }`;

  return (
    <section id="ayahs" aria-labelledby="ayahs-title" className="glass-card flex scroll-mt-24 flex-col gap-6 rounded-3xl p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="ayahs-title" className="font-display text-2xl font-bold text-gold-soft">
          نص السورة
        </h2>
        {hasTimings && (
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-muted">
            <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} className="h-5 w-5 accent-[#CDAA62]" />
            تتبّع الآية تلقائيًا
          </label>
        )}
      </div>

      {timed.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-white/10 p-4">
          <span className="text-sm font-semibold text-gold-soft">تكرار للحفظ</span>
          {repeat ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm" aria-live="polite">
                بيكرّر {from === to ? `الآية ${toArabicDigits(from)}` : `من الآية ${toArabicDigits(from)} إلى ${toArabicDigits(to)}`} · المرة{" "}
                {toArabicDigits(repeat.round)}
                {times ? ` من ${toArabicDigits(times)}` : ""}
              </span>
              <button type="button" onClick={stopRepeat} className="min-h-11 rounded-full border border-gold/40 px-5 text-sm text-gold-soft transition-colors hover:bg-gold/10">
                إيقاف التكرار
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <label className="flex items-center gap-2">
                من الآية
                <select value={from} onChange={(e) => { const v = Number(e.target.value); setFrom(v); if (to < v) setTo(v); }} className={selectClass}>
                  {timed.map((t) => <option key={t.ayah} value={t.ayah}>{toArabicDigits(t.ayah)}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-2">
                إلى
                <select value={to} onChange={(e) => setTo(Number(e.target.value))} className={selectClass}>
                  {timed.filter((t) => t.ayah >= from).map((t) => <option key={t.ayah} value={t.ayah}>{toArabicDigits(t.ayah)}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-2">
                عدد المرات
                <select value={times} onChange={(e) => setTimes(Number(e.target.value))} className={selectClass}>
                  {[2, 3, 5, 7, 10, 20].map((n) => <option key={n} value={n}>{toArabicDigits(n)}</option>)}
                  <option value={0}>بلا توقف</option>
                </select>
              </label>
              <button type="button" onClick={startRepeat} className="min-h-11 rounded-full bg-gold px-5 font-semibold text-gold-ink transition-opacity hover:opacity-90 sm:ms-auto">
                ابدأ التكرار
              </button>
            </div>
          )}
        </div>
      )}

      {basmala && (
        <p ref={setRef(0)} className={`text-center font-quran text-2xl leading-[2.2] sm:text-3xl ${active === 0 ? "text-gold-soft" : ""}`}>
          {BASMALA}
        </p>
      )}

      <p className="text-justify font-quran text-2xl leading-[2.4] sm:text-[1.9rem]">
        {ayahs.map((a) => (
          <span
            key={a.n}
            ref={setRef(a.n)}
            role={hasTimings ? "button" : undefined}
            tabIndex={hasTimings ? 0 : undefined}
            aria-label={hasTimings ? `انتقل للآية ${toArabicDigits(a.n)}` : undefined}
            onClick={hasTimings ? () => jump(a.n) : undefined}
            onKeyDown={hasTimings ? (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), jump(a.n)) : undefined}
            className={ayahClass(a.n)}
          >
            {a.text} <span className="text-gold/80">﴿{toArabicDigits(a.n)}﴾</span>{" "}
          </span>
        ))}
      </p>

      <p className="text-xs text-muted">
        النص بالرسم العثماني من alquran.cloud، وتوقيت الآيات من MP3Quran.
        {hasTimings ? " اضغط على أي آية للانتقال إليها." : ""}
      </p>
    </section>
  );
}