"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/format";
import { formatSize, removeOffline, useOffline } from "@/lib/offline";
import { usePlayer } from "./PlayerProvider";
import { RecordingCover } from "./RecordingCover";
import { PauseIcon, PlayIcon } from "./icons";

/** صفحة المحفوظات: التلاوات اللي على الجهاز، ومساحتها، وتشغيلها من غير نت */
export function SavedView() {
  const off = useOffline();
  const player = usePlayer();
  const [quota, setQuota] = useState<{ usage: number; quota: number } | null>(null);
  const [online, setOnline] = useState(true);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    navigator.storage?.estimate?.().then((e) => e.quota && setQuota({ usage: e.usage ?? 0, quota: e.quota }));
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const offline = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", offline);
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setIos(/iPhone|iPad|iPod/.test(navigator.userAgent) && !standalone);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", offline);
    };
  }, [off.items.length]);

  const items = [...off.items].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  const queue = items.map((x) => x.rec);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">المحفوظات</h1>
        <p className="max-w-2xl text-lg leading-8 text-muted">
          التلاوات المحفوظة على جهازك، تسمعها من غير إنترنت. لحفظ تلاوة، افتحها واضغط «حفظ للاستماع بدون إنترنت».
        </p>
        {!online && <p className="text-gold-soft">أنت الآن بدون اتصال، ويمكنك تشغيل التلاوات المحفوظة فقط.</p>}
      </div>

      {ios && (
        <p className="rounded-2xl border border-gold/40 bg-gold/5 p-4 text-sm leading-7">
          على الآيفون: أضف الموقع إلى الشاشة الرئيسية من زر المشاركة، حتى لا يحذف المتصفح التلاوات المحفوظة إذا لم تفتح الموقع لفترة.
        </p>
      )}

      {items.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
          <span>
            {items.length} تلاوة · {formatSize(off.totalSize)}
            {quota && ` · المساحة المتاحة للموقع: ${formatSize(Math.max(0, quota.quota - quota.usage))}`}
          </span>
          <button type="button" onClick={() => player.playQueue(queue, 0)} className="min-h-11 rounded-full bg-gold px-5 font-semibold text-gold-ink hover:bg-gold-soft">
            تشغيل الكل
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line-strong px-6 py-12 text-center leading-8 text-muted">
          لا توجد تلاوات محفوظة بعد.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map(({ rec, size }, i) => {
            const playing = player.current?.id === rec.id && player.isPlaying;
            return (
              <li key={rec.id} className="glass-card flex items-center gap-3 rounded-2xl p-3">
                <RecordingCover recording={rec} sizes="56px" className="h-14 w-14 shrink-0 rounded-xl" />
                <Link href={`/${rec.category}/${rec.id}`} className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-semibold">{rec.title || rec.prayerLabel}</span>
                  <span className="truncate text-sm text-muted">
                    {[rec.subtitle, rec.durationSec ? formatDuration(rec.durationSec) : "", formatSize(size)].filter(Boolean).join(" · ")}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => player.playQueue(queue, i)}
                  aria-label={`${playing ? "إيقاف" : "تشغيل"} ${rec.title}`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold text-gold-ink hover:bg-gold-soft"
                >
                  {playing ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
                </button>
                <button
                  type="button"
                  onClick={() => removeOffline(rec.id)}
                  aria-label={`حذف ${rec.title} من الجهاز`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted hover:text-[#E5636B]"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
