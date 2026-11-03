"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { Recording } from "@/types";
import { useFavorites } from "@/lib/useFavorites";
import { RecordingList } from "./RecordingList";
import { HeartIcon } from "./icons";

const titleClass = "font-display text-5xl font-bold leading-tight sm:text-6xl";

/** بيطابق الـ ids المحفوظة في المتصفح مع التسجيلات، والأحدث إضافة الأول */
export function FavoritesView({ all, title }: { all: Recording[]; title: string }) {
  const { ids, ready } = useFavorites();

  const items = useMemo(() => {
    const byId = new Map(all.map((r) => [r.id, r]));
    return [...ids]
      .reverse()
      .map((id) => byId.get(id))
      .filter((r): r is Recording => !!r);
  }, [all, ids]);

  if (!ready) return <h1 className={titleClass}>{title}</h1>;

  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className={titleClass}>{title}</h1>
        <div className="glass-card flex flex-col items-center gap-4 rounded-3xl px-6 py-14 text-center">
          <HeartIcon className="h-10 w-10 text-gold" />
          <p className="text-lg font-semibold">لم تُضف أي تلاوة إلى المفضلة بعد</p>
          <p className="max-w-md leading-7 text-muted">اضغط على القلب في أي تلاوة أو في المشغّل، وستجدها هنا.</p>
          <Link
            href="/"
            className="mt-2 flex min-h-11 items-center rounded-full bg-gold px-6 font-semibold text-gold-ink transition-colors hover:bg-gold-soft"
          >
            تصفّح التلاوات
          </Link>
        </div>
      </div>
    );
  }

  return <RecordingList title={title} items={items} searchable />;
}