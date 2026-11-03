"use client";

import Link from "next/link";
import { useId, useState } from "react";
import type { Category, Recording } from "@/types";
import { toArabicDigits } from "@/lib/format";
import { RecordingList } from "./RecordingList";


export interface HomeSection {
  slug: Category;
  title: string;
  description: string;
  total: number;
  latest: Recording[];
}

/** الأقسام تابات فوق، وتحتها أحدث تسجيلات القسم المختار ككروت */
export function HomeBrowser({ sections }: { sections: HomeSection[] }) {
  const [active, setActive] = useState<Category | undefined>(sections[0]?.slug);
  const id = useId();
  const current = sections.find((s) => s.slug === active) ?? sections[0];
  if (!current) return null;

  const tabId = (slug: Category) => `${id}-tab-${slug}`;
  const panelId = `${id}-panel`;

  // الأسهم بتتنقل بين التابات (في RTL: الشمال = التالي)
  const onKeyDown = (e: React.KeyboardEvent) => {
    const i = sections.findIndex((s) => s.slug === current.slug);
    const map: Record<string, number> = {
      ArrowLeft: i + 1, ArrowDown: i + 1, ArrowRight: i - 1, ArrowUp: i - 1, Home: 0, End: sections.length - 1,
    };
    if (!(e.key in map)) return;
    e.preventDefault();
    const next = sections[(map[e.key] + sections.length) % sections.length];
    setActive(next.slug);
    document.getElementById(tabId(next.slug))?.focus();
  };

  return (
    <section id="sections" aria-label="الأقسام" className="flex scroll-mt-24 flex-col gap-6">
      <div
        role="tablist"
        aria-label="الأقسام"
        onKeyDown={onKeyDown}
        className="glass-card grid grid-cols-2 gap-1 rounded-[1.75rem] p-1.5 lg:grid-cols-4"
      >
        {sections.map((s) => {
          const selected = s.slug === current.slug;
          return (
            <button
              key={s.slug}
              id={tabId(s.slug)}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(s.slug)}
              className={`flex min-w-0 flex-col items-center justify-center rounded-3xl px-3 py-2 text-center transition-colors ${
                selected ? "bg-gold text-gold-ink shadow-glow" : "text-text hover:bg-white/5"
              }`}
            >
              <span className="truncate font-display text-xl font-bold leading-tight sm:text-2xl">{s.title}</span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={panelId} aria-labelledby={tabId(current.slug)} className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <p className="text-[15px] text-muted">{current.description}</p>
          <Link
            href={`/${current.slug}`}
            className="flex min-h-11 items-center rounded-full border border-line-strong px-5 text-[15px] text-text transition-colors hover:border-gold/60 hover:text-gold-soft"
          >
            عرض الكل
          </Link>
        </div>
        <RecordingList key={current.slug} items={current.latest} />
      </div>
    </section>
  );
}