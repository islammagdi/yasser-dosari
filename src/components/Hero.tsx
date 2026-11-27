"use client";

import { useL } from "@/lib/i18n/client";
import Image from "next/image";
import Link from "@/lib/i18n/nav";
import { useEffect, useState } from "react";

import type { ImamateSlot, Recording } from "@/types";
import { isNowLive, nextSlot } from "@/lib/imamate";
import { isPlayable } from "@/lib/labels";
import { Logo } from "./Logo";
import { usePlayer } from "./PlayerProvider";
import { MosqueIcon, PauseIcon, PlayIcon } from "./icons";

const HERO_IMAGE = "/images/sheikh.jpg";

export interface HeroStat {
  slug: string;
  title: string;
  total: number;
}

interface Props {
  /** أحدث صلاة من الحرم (أول فرض في الترتيب، أو أحدث تسجيل لو مفيش فروض) */
  latest: Recording | null;
  imamate: ImamateSlot[];
  /** عدد التسجيلات في كل قسم: إثبات حجم الأرشيف من أول نظرة */
  stats: HeroStat[];
}

/**
 * الهيرو الجديد (الريديزاين):
 * يمين: التعريف ← الاسم ← سطر يشرح الموقع ← زرارين ← أرقام الأرشيف.
 * شمال: كارت غامق فيه صورة الشيخ، وتحتها «أحدث صلاة من الحرم» والإمامة القادمة.
 */
export function Hero({ latest, imamate, stats }: Props) {
  const { t, en, formatDuration, recTitle, recSubtitle, toArabicDigits } = useL();
  const { current, isPlaying, playQueue, toggle } = usePlayer();

  const isCurrent = !!latest && current?.id === latest.id;
  const playingNow = isCurrent && isPlaying;
  const canPlay = !!latest && isPlayable(latest);
  const onPlay = () => {
    if (!latest) return;
    if (isCurrent) toggle();
    else playQueue([latest], 0);
  };

  return (
    <section aria-labelledby="hero-title" className="grid items-center gap-8 pt-2 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-12 lg:pt-10">
      {/* ---------- النص ---------- */}
      <div className="flex flex-col gap-6">
        <p className="rise flex items-center gap-3 caption-3 text-gold">
          <span aria-hidden className="h-px w-6 bg-gold/60" />
          {t("إمام وخطيب المسجد الحرام")}
        </p>

        {en ? (
          <h1 id="hero-title" className="rise heading-2 text-emerald dark:text-[#F6F1E6] lg:heading-1" style={delay(80)}>
            Sheikh Yasser Al-Dosari
          </h1>
        ) : (
          <h1 id="hero-title" className="rise flex items-end gap-3 sm:gap-4" style={delay(80)}>
            <span className="shrink-0 pb-[0.14em] font-ruqaa text-4xl font-bold leading-none text-emerald dark:text-[#F6F1E6] sm:text-6xl lg:text-7xl">
              {t("الشيخ")}
            </span>
            <Logo label={t("ياسر الدوسري")} className="w-[240px] min-w-0 sm:w-[360px] lg:w-[440px]" />
          </h1>
        )}

        <p className="rise max-w-[520px] text-lg leading-8 text-muted sm:text-xl" style={delay(140)}>
          {t("كل صلاة أمّها في المسجد الحرام، مرتّبة بالتاريخ الهجري. ومعها المصحف كاملًا، والتراويح، والخطب، في مكان واحد.")}
        </p>

        <div className="rise flex flex-wrap items-center gap-3" style={delay(200)}>
          {latest && (
            <button
              type="button"
              onClick={onPlay}
              disabled={!canPlay}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 button-md text-accent-ink transition-colors duration-300 ease-out hover:bg-accent-hover active:scale-[0.98] disabled:opacity-40"
            >
              {playingNow ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
              {playingNow ? t("إيقاف") : t("اسمع آخر صلاة")}
            </button>
          )}
          <Link
            href="/fard"
            className="inline-flex items-center rounded-full border border-line-strong px-5 py-3 button-md text-emerald transition-colors duration-300 ease-out hover:bg-fg/5 active:scale-[0.98] dark:text-gold-soft"
          >
            {t("تصفّح الأرشيف")}
          </Link>
        </div>

        {stats.length > 0 && (
          <dl className="rise grid grid-cols-2 gap-x-6 gap-y-3 border-t sm:flex sm:flex-wrap border-line pt-4" style={delay(260)}>
            {stats.map((s) => (
              <div key={s.slug} className="flex flex-col">
                <dd className="heading-5 tabular-nums text-text">{toArabicDigits(s.total)}</dd>
                <dt className="caption-5 text-muted">{t(s.title)}</dt>
              </div>
            ))}
          </dl>
        )}
      </div>

      {/* ---------- الكارت: الصورة + أحدث صلاة + الإمامة القادمة ---------- */}
      <div className="rise relative isolate flex min-h-[420px] flex-col justify-end overflow-hidden rounded-[32px] bg-deep p-3 shadow-float sm:min-h-[520px] sm:p-4 lg:min-h-[560px]" style={delay(120)}>
        <Image
          src={HERO_IMAGE}
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 46vw, 100vw"
          className="-z-10 object-cover object-[50%_18%] opacity-90"
        />
        {/* تعتيم خفيف تحت عشان الكارت الأبيض يبان */}
        <span aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-gradient-to-t from-deep/90 to-transparent" />

        <span className="mb-3 inline-flex items-center gap-2 self-start rounded-full bg-[#F6F1E6]/15 px-3 py-1.5 caption-3 text-[#E7CD94] backdrop-blur-md">
          <span aria-hidden className="h-2 w-2 rounded-full bg-[#CDAA62]" />
          {t("أحدث صلاة من الحرم")}
        </span>

        <div className="flex flex-col gap-4 rounded-3xl bg-raised/95 p-4 text-text backdrop-blur-md sm:p-5">
          {latest ? (
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={onPlay}
                disabled={!canPlay}
                aria-label={`${playingNow ? t("إيقاف") : t("تشغيل")} ${recTitle(latest)}`}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink transition-colors duration-300 ease-out hover:bg-accent-hover active:scale-[0.98] disabled:opacity-40"
              >
                {playingNow ? <PauseIcon className="h-6 w-6" /> : <PlayIcon className="h-6 w-6" />}
              </button>
              <div className="flex min-w-0 flex-1 flex-col">
                <Link href={`/${latest.category}/${latest.id}`} className="truncate title-2 hover:text-emerald dark:hover:text-gold-soft">
                  {recTitle(latest)}
                </Link>
                <span className="truncate caption-2 text-muted">
                  {[recSubtitle(latest), latest.durationSec ? formatDuration(latest.durationSec) : null].filter(Boolean).join(" · ")}
                </span>
              </div>
            </div>
          ) : (
            <p className="body-6 text-muted">{t("لسه مفيش تسجيلات.")}</p>
          )}
          <ImamateLine slots={imamate} />
        </div>
      </div>
    </section>
  );
}

const delay = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

/** بداية الصلاة (وقت الأذان) بتوقيت مكة (UTC+3 ثابت) كـ timestamp، لو الجدول فيه الوقت */
function slotTime(slot: ImamateSlot): number | null {
  if (!slot.start) return null;
  const v = Date.parse(`${slot.date}T${slot.start}:00+03:00`);
  return Number.isFinite(v) ? v : null;
}

/** سطر الإمامة القادمة جوه كارت الهيرو: الصلاة واليوم، والوقت الباقي لو خلال ٢٤ ساعة */
function ImamateLine({ slots }: { slots: ImamateSlot[] }) {
  const { t, toArabicDigits, hijriDayLabel, prayerTitle, relativeDayLabel } = useL();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const slot = now ? nextSlot(slots, now) : null;
  const live = !!(now && slot && isNowLive(slot, now));
  const at = slot ? slotTime(slot) : null;
  const left = now && at ? at - now.getTime() : null;
  const soon = left !== null && left > 0 && left < 24 * 3600_000;
  const h = soon ? Math.floor(left / 3600_000) : 0;
  const m = soon ? Math.floor((left % 3600_000) / 60_000) : 0;

  return (
    <div className="flex items-center gap-3 border-t border-line pt-4" aria-live="polite">
      <MosqueIcon className="h-5 w-5 shrink-0 text-gold" />
      <p className="min-w-0 flex-1 truncate body-6">
        {now === null ? (
          <span aria-hidden className="inline-block h-4 w-40 animate-pulse rounded bg-fg/10 align-middle" />
        ) : slot ? (
          <>
            <b className="font-semibold">{live ? t("الآن في المسجد الحرام:") : t("الإمامة القادمة:")}</b>{" "}
            {prayerTitle(slot.prayer)}
            {t("،")} {live ? t("بإمامة الشيخ") : relativeDayLabel(slot.nightOf ?? slot.date, now) || hijriDayLabel(slot.date)}
            {soon && !live && (
              <span className="text-muted">
                {" · "}
                {t("بعد {h} س {m} د", { h: toArabicDigits(h), m: toArabicDigits(m) })}
              </span>
            )}
          </>
        ) : (
          t("الجدول بيتعلن أسبوعيًا")
        )}
      </p>
      <Link href="/imamate" className="shrink-0 button-sm text-gold hover:text-gold-soft">
        {t("ذكّرني")}
      </Link>
    </div>
  );
}
