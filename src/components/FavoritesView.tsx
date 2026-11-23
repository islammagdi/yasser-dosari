"use client";

import { useL } from "@/lib/i18n/client";
import type { ClipCard } from "./ClipOfDay";
import Link from "@/lib/i18n/nav";
import { useMemo } from "react";
import type { Recording } from "@/types";
import { useFavorites } from "@/lib/useFavorites";
import { RecordingList } from "./RecordingList";
import { HeartIcon } from "./icons";

const titleClass = "font-display text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl";

/** بيطابق الـ ids المحفوظة في المتصفح مع التسجيلات، والأحدث إضافة الأول */
export function FavoritesView({ all, clips = [], title }: { all: Recording[]; clips?: ClipCard[]; title: string }) {
  const { t } = useL();
  const { ids, ready } = useFavorites();

  const items = useMemo(() => {
    const byId = new Map(all.map((r) => [r.id, r]));
    return [...ids]
      .reverse()
      .map((id) => byId.get(id))
      .filter((r): r is Recording => !!r);
  }, [all, ids]);

  // المقتطفات المحفوظة (ids بتبدأ بـ clip-)، الأحدث حفظًا الأول
  const savedClips = useMemo(() => {
    const byId = new Map(clips.map((c) => [c.id, c]));
    return [...ids]
      .reverse()
      .map((id) => byId.get(id))
      .filter((c): c is ClipCard => !!c);
  }, [clips, ids]);

  const clipsSection = savedClips.length > 0 && (
    <section aria-labelledby="saved-clips-title" className="flex flex-col gap-3">
      <h2 id="saved-clips-title" className="font-display text-2xl font-bold">
        
        {t("مقتطفات محفوظة")}
      </h2>
      <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
        {savedClips.map((c) => (
          <li key={c.id} className="w-28 shrink-0">
            <Link href={`/clips?c=${c.id}`} className="flex flex-col gap-1.5">
              <span className="aspect-[9/16] overflow-hidden rounded-2xl bg-fg/5">
                {c.poster && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.poster} alt="" loading="lazy" className="h-full w-full object-cover" />
                )}
              </span>
              <span className="line-clamp-2 text-sm">{c.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );

  // رابط لقوائم التشغيل جنب العنوان
  const heading = (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <h1 className={titleClass}>{title}</h1>
      <Link href="/playlists" className="min-h-11 py-2.5 text-[15px] font-semibold text-gold-soft underline-offset-4 hover:underline">
        
        {t("قوائم التشغيل")}
      </Link>
    </div>
  );

  if (!ready) return heading;

  if (items.length === 0 && savedClips.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {heading}
        <div className="glass-card flex flex-col items-center gap-4 rounded-3xl px-6 py-14 text-center">
          <HeartIcon className="h-10 w-10 text-gold" />
          <p className="text-lg font-semibold">{t("لم تُضف أي تلاوة إلى المفضلة بعد")}</p>
          <p className="max-w-md leading-7 text-muted">{t("اضغط على القلب في أي تلاوة أو في المشغّل، وستجدها هنا.")}</p>
          <Link
            href="/"
            className="mt-2 flex min-h-11 items-center rounded-full bg-accent px-6 font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
          >
            
            {t("تصفّح التلاوات")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {heading}
      {clipsSection}
      {items.length > 0 && <RecordingList items={items} searchable />}
    </div>
  );
}