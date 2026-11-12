"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { ImamateSlot, Recording } from "@/types";
import { getCategory } from "@/lib/categories";
import { pickForDate } from "@/lib/dailyPick";
import { formatDuration } from "@/lib/format";
import { makkahToday } from "@/lib/imamate";
import { isPlayable } from "@/lib/labels";
import { HomeStrip } from "./HomeStrip";
import { Logo } from "./Logo";
import { usePlayer } from "./PlayerProvider";
import { PauseIcon, PlayIcon } from "./icons";

const HERO_IMAGE = "/images/sheikh.jpg";
const BARS = 56;
const delay = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

/** موجة ثابتة لكل تسجيل (من الـ id)، عشان شكلها ميتغيرش مع كل رندر */
function waveFor(id: string): number[] {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return Array.from({ length: BARS }, (_, i) => {
    h = (h * 1103515245 + 12345) >>> 0;
    const base = Math.abs(Math.sin(i * 0.55) * Math.cos(i * 0.21));
    return 0.3 + base * 0.55 + ((h >>> 16) % 100) / 700;
  });
}

interface Props {
  recent: Recording[];
  imamate: ImamateSlot[];
  dailyPool: Recording[];
  dailyPinned: Record<string, Recording>;
}

/**
 * الهيرو: مسار قراءة واحد من اليمين — التعريف ← الاسم ← تلاوة اليوم.
 * الصورة على الشمال باهتة وسايحة في الخلفية، وتحت الهيرو شريط المعلومات الثانوية.
 */
export function Hero({ recent, imamate, dailyPool, dailyPinned }: Props) {
  const { current, isPlaying, currentTime, duration, playQueue, toggle } = usePlayer();

  // تلاوة اليوم بتتحسب في المتصفح بتاريخ مكة؛ ولحد ما تتحسب (أو لو مفيش) بنعرض أحدث تلاوة
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(makkahToday(new Date())), []);
  const daily = today ? dailyPinned[today] ?? pickForDate(today, dailyPool) : undefined;
  const featured = daily ?? recent[0];
  const label = daily ? "تلاوة اليوم" : "أُضيف حديثًا";

  const isCurrent = !!featured && current?.id === featured.id;
  const playingNow = isCurrent && isPlaying;
  const total = isCurrent && duration ? duration : featured?.durationSec ?? 0;
  const pct = isCurrent && total ? Math.min(1, currentTime / total) : 0;
  const bars = useMemo(() => (featured ? waveFor(featured.id) : []), [featured]);

  const title = featured ? featured.title || featured.prayerLabel || "" : "";
  const meta = featured ? featured.subtitle || getCategory(featured.category)?.title || "" : "";

  const onPlay = () => {
    if (!featured) return;
    if (isCurrent) toggle();
    else if (daily) playQueue([featured], 0);
    else playQueue(recent, 0);
  };

  return (
    <section aria-labelledby="hero-title" className="full-bleed relative isolate -mt-8 sm:-mt-10">
      {/* الصورة: فوق بعرض الشاشة على الموبايل، وعلى الشمال من حرف الشاشة في الديسكتوب */}
      <div className="relative -z-10 h-[360px] w-full sm:h-[440px] lg:absolute lg:inset-y-0 lg:left-0 lg:-top-24 lg:h-auto lg:w-[46%] lg:max-w-[700px]">
        <Image
          src={HERO_IMAGE}
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 46vw, 100vw"
          className="hero-portrait object-cover object-[50%_20%] lg:object-[45%_18%]"
        />
        {/* قوس المحراب: خط خفيف بس، الصورة بتغطيه عند الوش */}
        <span
          aria-hidden
          className="absolute inset-x-[12%] bottom-0 top-[12%] -z-10 hidden rounded-t-full border border-b-0 border-gold/40 [mask-image:linear-gradient(to_bottom,#000_60%,transparent)] lg:block"
        />
      </div>

      <div className="mx-auto max-w-page px-4 sm:px-6">
        <div className="-mt-28 flex flex-col gap-5 sm:-mt-32 lg:ms-0 lg:mt-0 lg:min-h-[640px] lg:w-[52%] lg:max-w-[660px] lg:justify-center lg:py-12">
          <p className="rise flex items-center gap-3.5 text-[15px] font-semibold text-gold sm:text-base">
            <span aria-hidden className="h-px w-10 shrink-0 bg-gold/60 sm:w-12" />
            إمام وخطيب المسجد الحرام
          </p>

          <h1 id="hero-title" className="rise flex items-end gap-3 sm:gap-4" style={delay(80)}>
            <span className="shrink-0 pb-[0.14em] font-ruqaa text-[2.6rem] font-bold leading-none text-emerald dark:text-[#F6F1E6] sm:text-[3.6rem] lg:text-[4.6rem]">
              الشيخ
            </span>
            <Logo label="ياسر الدوسري" className="w-[250px] min-w-0 sm:w-[360px] lg:w-[460px]" />
          </h1>

          <p className="rise max-w-[540px] text-base leading-[1.9] text-muted sm:text-lg" style={delay(140)}>
            تلاواته في صلوات الفروض والتراويح بالمسجد الحرام، والمصحف المسجّل، وخطبه ومحاضراته، في مكان واحد.
          </p>

          {/* تلاوة اليوم: الكارت الوحيد الغامق في الهيرو، وأول حاجة ممكن الزائر يعملها */}
          {featured && (
            <div
              className="rise relative isolate mt-2 overflow-hidden rounded-[28px] bg-deep px-5 pb-5 pt-5 text-[#F1EEE6] shadow-float sm:px-7 sm:pt-6"
              style={delay(200)}
            >
              <span aria-hidden className="pattern-stars absolute inset-0 -z-10 opacity-10" />
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={onPlay}
                  disabled={!isPlayable(featured)}
                  aria-label={`${playingNow ? "إيقاف" : "تشغيل"} ${title}`}
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#CDAA62] text-[#1A1408] transition-colors hover:bg-[#E7CD94] disabled:opacity-40 sm:h-16 sm:w-16"
                >
                  {playingNow ? <PauseIcon className="h-6 w-6" /> : <PlayIcon className="h-6 w-6" />}
                </button>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[13px] font-semibold text-[#E7CD94]">{playingNow ? "يعمل الآن" : label}</span>
                  <Link
                    href={`/${featured.category}/${featured.id}`}
                    className="truncate font-display text-2xl font-bold leading-snug hover:text-[#E7CD94] sm:text-[28px]"
                  >
                    {title}
                  </Link>
                  {meta && <span className="truncate text-sm text-[#A9B7AF]">{meta}</span>}
                </div>
                {total > 0 && (
                  <span className="hidden shrink-0 text-[13px] tabular-nums text-[#A9B7AF] sm:block">
                    {isCurrent ? `${formatDuration(currentTime)} من ${formatDuration(total)}` : formatDuration(total)}
                  </span>
                )}
              </div>

              {/* الموجة: بتتملى من اليمين مع التشغيل */}
              <div aria-hidden className="mt-4 flex h-11 items-center gap-[3px]">
                {bars.map((b, i) => (
                  <span
                    key={i}
                    className={`flex-1 rounded-full transition-colors ${i / BARS < pct ? "bg-[#CDAA62]" : "bg-[#F1EEE6]/20"}`}
                    style={{ height: `${Math.round(b * 100)}%` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rise relative z-10 mt-6 lg:mt-2" style={delay(260)}>
          <HomeStrip slots={imamate} />
        </div>
      </div>
    </section>
  );
}
