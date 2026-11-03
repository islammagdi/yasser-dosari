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

/** الهيرو بعرض الشاشة كله، ومدموج فيه "تمت إضافته حديثًا" */
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
        className="pattern-stars absolute inset-0 -z-20 opacity-20 [mask-image:radial-gradient(ellipse_55%_70%_at_75%_45%,#000,transparent)]"
      />

      {/* صورة الشيخ: فوق على الموبايل، وعلى الشمال بطول الهيرو في الشاشات الكبيرة */}
      <div className="hero-photo relative -z-10 h-[340px] w-full sm:h-[460px] lg:absolute lg:inset-y-0 lg:left-0 lg:h-auto lg:w-[48%]">
        <Image
          src={HERO_IMAGE}
          alt="الشيخ ياسر الدوسري"
          fill
          priority
          sizes="(min-width: 1024px) 48vw, 100vw"
          className="object-cover object-[50%_35%]"
        />
      </div>

          <div className="mx-auto flex max-w-page flex-col px-4 pb-4 sm:px-6 lg:min-h-[620px] lg:justify-center lg:pb-10 lg:pt-16">
             <div className="-mt-28 flex flex-col gap-8 sm:-mt-32 lg:mt-0 lg:max-w-[620px]">
          <div className="flex flex-col gap-4">
            <p className="rise relative flex items-center gap-4 rounded-3xl border border-gold/30 bg-ink/45 p-4 backdrop-blur-md transition-colors hover:border-gold/50 sm:gap-5 sm:p-5">
              <span aria-hidden className="h-px w-10 bg-gold/60" />
              إمام وخطيب المسجد الحرام
            </p>
            <h1 id="hero-title" className="rise" style={delay(80)}>
              <Image
                src="/images/logo.png"
                alt="الشيخ ياسر الدوسري"
                width={0}
                height={0}
                sizes="(min-width: 1024px) 440px, (min-width: 640px) 360px, 280px"
                priority
                className="h-auto w-[280px] sm:w-[360px] lg:w-[440px]"
              />
            </h1>

          </div>

          <div className="rise" style={delay(220)}>
            <NextImamate slots={imamate} />
          </div>

          {featured && (
            <div className="rise glass rounded-3xl border border-white/10 p-4 shadow-float sm:p-5" style={delay(260)}>
              <h2 className="flex items-center gap-2 pb-4 text-sm font-semibold text-gold">
                <span aria-hidden className="h-2 w-2 rounded-full bg-gold" />
                تمت إضافته حديثًا
              </h2>

              <div className="flex items-center gap-4">
                <span className="relative h-20 w-20 shrink-0">
                  <RecordingCover recording={featured} sizes="80px" className="h-20 w-20 rounded-2xl" />
                  {featuredPlaying && (
                    <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-ink/60">
                      <EqualizerIcon className="h-6 w-6 text-gold" />
                    </span>
                  )}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="truncate font-display text-2xl font-bold sm:text-3xl">{featured.title}</p>
                  <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted">
                    {meta.map((m, i) => (
                      <span key={i}>{m}</span>
                    ))}
                  </p>
                </div>
                <button
                  type="button"
onClick={() => playQueue(recent, 0)}
                  disabled={!isPlayable(featured)}
                  aria-label={`${featuredPlaying ? "إيقاف" : "تشغيل"} ${featured.title}`}
                                 className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gold text-gold-ink shadow-glow transition-colors hover:bg-gold-soft disabled:opacity-40 disabled:shadow-none"
                >
                {featuredPlaying ? <PauseIcon className="h-7 w-7" /> : <PlayIcon className="h-7 w-7" />}
              </button>
              {/* الضغط على باقي الكارت بيفتح صفحة التلاوة */}
              <Link href={`/${featured.category}/${featured.id}`} aria-label={featured.title} className="absolute inset-0 rounded-3xl" />
              </div>


            </div>
          )}
        </div>
      </div>
    </section>
  );
}