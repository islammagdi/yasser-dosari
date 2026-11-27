"use client";

import { useEffect, useMemo, useRef } from "react";
import { useL } from "@/lib/i18n/client";
import { getCategory } from "@/lib/categories";
import type { Category, Recording } from "@/types";
import { usePlayer } from "./PlayerProvider";

interface Channel {
  key: string;
  label: string;
  hint: string;
  categories: Category[];
}

/** قنوات الإذاعة: كل التلاوات، أو قسم واحد */
const CHANNELS: Channel[] = [
  { key: "all", label: "كل التلاوات", hint: "فروض وتراويح ومصحف", categories: ["fard", "taraweeh", "rare", "mushaf"] },
  { key: "fard", label: "الفروض", hint: "من صلوات المسجد الحرام", categories: ["fard"] },
  { key: "taraweeh", label: "التراويح", hint: "ليالي رمضان", categories: ["taraweeh"] },
  { key: "mushaf", label: "المصحف المسجل", hint: "سور كاملة", categories: ["mushaf"] },
];

/**
 * الإذاعة: زرار تشغيل واحد، والتلاوات بتشتغل عشوائيًا ورا بعض من غير توقف.
 * التشغيل نفسه في PlayerProvider (startRadio)، فالإذاعة بتكمّل وانت بتتنقّل في الموقع.
 */
export function RadioView({ pool }: { pool: Recording[] }) {
  const { t, recTitle } = useL();
  const p = usePlayer();

  const channels = useMemo(
    () =>
      CHANNELS.map((c) => ({ ...c, items: pool.filter((r) => c.categories.includes(r.category)) })).filter((c) => c.items.length > 0),
    [pool],
  );

  const active = p.radio ? channels.find((c) => c.key === p.radio) : undefined;
  const onAir = Boolean(active && p.isPlaying);
  const upNext = p.radio ? p.queue[p.queueIndex + 1] : undefined;

  const play = (c: (typeof channels)[number]) => {
    if (p.radio === c.key) p.toggle();
    else p.startRadio(c.items, c.key);
  };
  const main = active ?? channels[0];

  // جاي من زرار «اسمع الإذاعة» في الرئيسية (/radio?play=1): نشغّل علطول.
  // لو المتصفح منع التشغيل التلقائي، الزرار الكبير موجود والزائر يدوس عليه.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current || !main) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("play") !== "1") return;
    autoStarted.current = true;
    url.searchParams.delete("play");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    if (!p.radio) p.startRadio(main.items, main.key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [main]);

  if (!channels.length) {
    return <p className="py-20 text-center text-muted">{t("الإذاعة هتشتغل قريب إن شاء الله.")}</p>;
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 py-4">
      <section className="glass-card relative flex flex-col items-center gap-6 overflow-hidden rounded-[2rem] px-6 py-10 text-center sm:px-10">
        <span
          className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${
            onAir ? "bg-[#E5484D] text-white" : "bg-fg/10 text-muted"
          }`}
        >
          <span className="relative flex h-2 w-2">
            {onAir && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/80 motion-reduce:animate-none" />}
            <span className={`relative inline-flex h-2 w-2 rounded-full ${onAir ? "bg-white" : "bg-muted"}`} />
          </span>
          {onAir ? t("على الهواء") : t("الإذاعة")}
        </span>

        <div className="flex flex-col gap-2">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">{t("إذاعة الشيخ ياسر الدوسري")}</h1>
          <p className="text-muted">{t("تلاوات مختارة عشوائيًا تشتغل ورا بعض من غير توقف.")}</p>
        </div>

        <button
          type="button"
          onClick={() => play(main)}
          aria-label={onAir ? t("إيقاف الإذاعة") : t("تشغيل الإذاعة")}
          className="relative flex h-24 w-24 items-center justify-center rounded-full bg-accent text-[#fff] shadow-float transition-transform hover:scale-105 active:scale-95 dark:text-accent-ink"
        >
          {onAir && <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-accent/30 motion-reduce:animate-none" />}
          {active && p.isLoading ? (
            <span aria-hidden className="h-8 w-8 animate-spin rounded-full border-[3px] border-current border-t-transparent" />
          ) : onAir ? (
            <svg aria-hidden viewBox="0 0 24 24" className="h-10 w-10" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1.2" />
              <rect x="14" y="5" width="4" height="14" rx="1.2" />
            </svg>
          ) : (
            <svg aria-hidden viewBox="0 0 24 24" className="h-10 w-10" fill="currentColor">
              <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
            </svg>
          )}
        </button>

        {active && p.current ? (
          <div className="flex w-full flex-col items-center gap-1" aria-live="polite">
            <span className="text-xs text-muted">{t("يُتلى الآن")}</span>
            <p className="line-clamp-2 text-lg font-semibold">{recTitle(p.current)}</p>
            <p className="text-sm text-muted">{t(getCategory(p.current.category)?.title ?? "")}</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={p.next}
                className="flex min-h-11 items-center gap-2 rounded-full border border-line-strong px-5 text-sm font-semibold transition-colors hover:border-gold/60 hover:text-gold-soft"
              >
                {t("تلاوة أخرى")}
                <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 rtl:-scale-x-100" fill="currentColor">
                  <path d="M5 6.2v11.6a1 1 0 0 0 1.5.86L15 13.5V17a1 1 0 0 0 2 0V7a1 1 0 0 0-2 0v3.5L6.5 5.34A1 1 0 0 0 5 6.2Z" />
                </svg>
              </button>
            </div>
            {upNext && (
              <p className="mt-2 max-w-full truncate text-xs text-muted">
                {t("التالية:")} {recTitle(upNext)}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted">{t("اضغط تشغيل، والتلاوات هتكمّل لوحدها حتى وانت بتتنقّل في الموقع.")}</p>
        )}
      </section>

      <section aria-labelledby="radio-channels" className="flex flex-col gap-3">
        <h2 id="radio-channels" className="font-display text-2xl font-bold">
          {t("القنوات")}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {channels.map((c) => {
            const on = p.radio === c.key;
            const playing = on && p.isPlaying;
            return (
              <li key={c.key}>
                <button
                  type="button"
                  onClick={() => play(c)}
                  aria-pressed={on}
                  className={`glass-card flex w-full items-center gap-4 rounded-2xl p-4 text-start transition-colors ${
                    on ? "ring-2 ring-accent" : "hover:bg-fg/5"
                  }`}
                >
                  <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                      on ? "bg-accent text-[#fff] dark:text-accent-ink" : "bg-accent/10 text-accent dark:text-gold"
                    }`}
                  >
                    {playing ? (
                      <span aria-hidden className="flex h-5 items-end gap-[3px]">
                        <span className="eq-bar h-full w-[3px] rounded-full bg-current" />
                        <span className="eq-bar h-full w-[3px] rounded-full bg-current" />
                        <span className="eq-bar h-full w-[3px] rounded-full bg-current" />
                      </span>
                    ) : (
                      <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                        <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
                      </svg>
                    )}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="font-semibold">{t(c.label)}</span>
                    <span className="text-sm text-muted">{t(c.hint)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
