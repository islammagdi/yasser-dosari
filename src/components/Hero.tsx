"use client";

import Image from "next/image";
import Link from "next/link";

import type { ImamateSlot, Recording } from "@/types";
import { getCategory } from "@/lib/categories";
import { isPlayable } from "@/lib/labels";
import { NextImamate } from "./NextImamate";
import { usePlayer } from "./PlayerProvider";
import { RecordingCover } from "./RecordingCover";

import { EqualizerIcon, PauseIcon, PlayIcon } from "./icons";

const HERO_IMAGE = "/images/sheikh.jpg";
const delay = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

/** الهيرو بعرض الشاشة: الاسم هو البطل، وتحته شريط واحد فيه "أُضيف حديثًا" والإمامة القادمة */
export function Hero({ recent, imamate }: { recent: Recording[]; imamate: ImamateSlot[] }) {
  const { current, isPlaying, playQueue } = usePlayer();
  const featured = recent[0];
  const featuredPlaying = !!featured && current?.id === featured.id && isPlaying;

  const meta = featured
    ? [getCategory(featured.category)?.title, featured.subtitle].filter(Boolean)
    : [];

  return (
    <section aria-labelledby="hero-title" className="full-bleed relative isolate -mt-8 overflow-hidden sm:-mt-10">
      {/* النقشة في الخلفية ناحية النص */}
      <div
        aria-hidden
        className="pattern-stars absolute inset-0 -z-20 opacity-[0.16] [mask-image:radial-gradient(ellipse_45%_60%_at_78%_40%,#000,transparent)]"
      />

      {/* صورة الشيخ: فوق على الموبايل، وعلى الشمال بطول الهيرو في الشاشات الكبيرة */}
      <div className="hero-photo relative -z-10 h-[340px] w-full sm:h-[460px] lg:absolute lg:inset-y-0 lg:left-0 lg:h-auto lg:w-[54%]">
        <Image
          src={HERO_IMAGE}
          alt="الشيخ ياسر الدوسري"
          fill
          priority
          sizes="(min-width: 1024px) 54vw, 100vw"
          className="object-cover object-[45%_30%]"
        />
      </div>

      <div className="mx-auto flex max-w-page flex-col gap-8 px-4 pb-6 sm:px-6 lg:min-h-[680px] lg:justify-between lg:gap-12 lg:pb-10 lg:pt-20">
        {/* الاسم والتعريف */}
        <div className="-mt-24 flex flex-col gap-5 sm:-mt-28 lg:mt-0 lg:max-w-[640px]">
          <p className="rise flex items-center gap-3.5 text-[15px] font-medium text-gold sm:text-base">
            <span aria-hidden className="h-px w-8 shrink-0 bg-gold/55 sm:w-12" />
            إمام وخطيب المسجد الحرام
          </p>

          <h1 id="hero-title" className="rise flex items-end gap-2.5 sm:gap-4" style={delay(80)}>
            <span className="shrink-0 pb-[0.12em] font-ruqaa text-[2.5rem] font-bold leading-none text-[#F6F1E6] sm:text-[3.4rem] lg:text-[4.25rem]">
              الشيخ
            </span>
            <Image
              src="/images/logo.png"
              alt="ياسر الدوسري"
              width={0}
              height={0}
              sizes="(min-width: 1024px) 440px, (min-width: 640px) 360px, 248px"
              priority
              className="h-auto w-[248px] min-w-0 sm:w-[360px] lg:w-[440px]"
            />
          </h1>

          <p className="rise max-w-[520px] text-base leading-[1.85] text-muted sm:text-lg" style={delay(160)}>
            تلاواته في صلوات الفروض والتراويح بالمسجد الحرام، والمصحف المسجّل، وخطبه ومحاضراته، في مكان واحد.
          </p>

          <Link
            href="#sections"
            className="rise inline-flex min-h-11 items-center gap-2 self-start font-semibold text-gold transition-colors hover:text-gold-soft"
            style={delay(200)}
          >
            تصفّح كل التلاوات
            <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
              <path d="M19 12H5M11 18l-6-6 6-6" />
            </svg>
          </Link>
        </div>

        {/* الشريط: أُضيف حديثًا + الإمامة القادمة في حاوية واحدة */}
        <div
          className="rise glass-card grid gap-4 rounded-3xl p-4 lg:grid-cols-[minmax(0,1.2fr)_auto_minmax(0,1fr)] lg:items-center lg:gap-8 lg:px-7 lg:py-5"
          style={delay(260)}
        >
          {featured ? (
            <div className="relative flex min-w-0 items-center gap-3.5 lg:gap-[18px]">
              <span className="relative h-16 w-16 shrink-0 lg:h-[76px] lg:w-[76px]">
                <RecordingCover recording={featured} sizes="76px" className="h-full w-full rounded-2xl" />
                {featuredPlaying && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-ink/60">
                    <EqualizerIcon className="h-6 w-6 text-gold" />
                  </span>
                )}
              </span>

              <div className="flex min-w-0 flex-1 flex-col gap-0.5 lg:gap-1">
                <h2 className="text-xs font-semibold text-gold lg:text-[13px]">أُضيف حديثًا</h2>
                <p className="line-clamp-2 font-display text-[19px] font-bold leading-[1.45] lg:truncate lg:text-[26px] lg:leading-[1.35]">
                  {featured.title}
                </p>
                {meta.length > 0 && (
                  <p className="truncate text-[13px] text-muted lg:text-sm">{meta.join(" · ")}</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => playQueue(recent, 0)}
                disabled={!isPlayable(featured)}
                aria-label={`${featuredPlaying ? "إيقاف" : "تشغيل"} ${featured.title}`}
                className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gold text-gold-ink transition-colors hover:bg-gold-soft disabled:opacity-40 lg:h-16 lg:w-16"
              >
                {featuredPlaying ? <PauseIcon className="h-6 w-6 lg:h-7 lg:w-7" /> : <PlayIcon className="h-6 w-6 lg:h-7 lg:w-7" />}
              </button>

              {/* الضغط على باقي الخانة بيفتح صفحة التلاوة */}
              <Link href={`/${featured.category}/${featured.id}`} aria-label={featured.title} className="absolute inset-0 rounded-2xl" />
            </div>
          ) : (
            <span aria-hidden className="hidden lg:block" />
          )}

          <span aria-hidden className="h-px w-full bg-line-strong lg:h-[72px] lg:w-px" />

          <NextImamate slots={imamate} />
        </div>
      </div>
    </section>
  );
}