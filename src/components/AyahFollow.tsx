"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Recording } from "@/types";
import type { Ayah, AyahTiming } from "@/lib/api/quranText";
import { toArabicDigits } from "@/lib/format";
import { usePlayer } from "./PlayerProvider";

const BASMALA = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";

/** نص السورة مع تلوين الآية اللي بتتقري، والضغط على آية بيوديك لها في التلاوة */
export function AyahFollow({
  recording,
  ayahs,
  basmala,
  timings,
}: {
  recording: Recording;
  ayahs: Ayah[];
  basmala: boolean;
  timings: AyahTiming[];
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

  const setRef = (n: number) => (el: HTMLElement | null) => {
    if (el) refs.current.set(n, el);
    else refs.current.delete(n);
  };

  const hasTimings = timings.length > 0;
  const ayahClass = (n: number) =>
    `rounded-lg transition-colors ${active === n ? "bg-gold/20 text-gold-soft" : ""} ${
      hasTimings ? "cursor-pointer hover:text-gold-soft" : ""
    }`;

  return (
    <section aria-labelledby="ayahs-title" className="glass-card flex flex-col gap-6 rounded-3xl p-5 sm:p-8">
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