"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { isRamadan } from "@/lib/imamate";
import type { Category, Recording } from "@/types";
import { toArabicDigits } from "@/lib/format";
import { useLastVisit } from "@/lib/useVisit";
import { RecordingList } from "./RecordingList";

export interface HomeSection {
  slug: Category;
  title: string;
  description: string;
  total: number;
  latest: Recording[];
  /** تواريخ إضافة أحدث التسجيلات (لعلامة "جديد") */
  recentAdded?: string[];
}

/** عدد الكروت في الرئيسية؛ الخانة الخامسة بقت "عرض الكل" */
const HOME_LIMIT = 4;

/**
 * تابات الأقسام: على الموبايل pills بتتسحب أفقي، ومن sm وطالع تابات نصية بخط تحت المختار.
 * "عرض الكل" بقت آخر خانة في الشبكة على الشاشات الكبيرة، وزرار بعرض الشاشة على الموبايل.
 */
export function HomeBrowser({ sections }: { sections: HomeSection[] }) {
  const [active, setActive] = useState<Category | undefined>(sections[0]?.slug);
  const id = useId();
  const lastVisit = useLastVisit();
  const newCount = (s: HomeSection) => (lastVisit ? (s.recentAdded ?? []).filter((d) => d > lastVisit).length : 0);
  // في رمضان التراويح هي اللي بتتفتح الأول
  useEffect(() => {
    if (isRamadan(new Date())) {
      if (sections.some((s) => s.slug === "taraweeh")) setActive("taraweeh");
    }
  }, [sections]);
  const current = sections.find((s) => s.slug === active) ?? sections[0];
  if (!current) return null;

  const tabId = (slug: Category) => `${id}-tab-${slug}`;
  const panelId = `${id}-panel`;
  const shown = current.latest.slice(0, HOME_LIMIT);

  // الأسهم بتتنقل بين التابات (في RTL: الشمال = التالي)
  const onKeyDown = (e: React.KeyboardEvent) => {
    const i = sections.findIndex((s) => s.slug === current.slug);
    const map: Record<string, number> = {
      ArrowLeft: i + 1, ArrowRight: i - 1, Home: 0, End: sections.length - 1,
    };
    if (!(e.key in map)) return;
    e.preventDefault();
    const next = sections[(map[e.key] + sections.length) % sections.length];
    setActive(next.slug);
    document.getElementById(tabId(next.slug))?.focus();
  };

  return (
    <section id="sections" aria-label="الأقسام" className="flex scroll-mt-24 flex-col gap-5 sm:gap-7">
      <div
        role="tablist"
        aria-label="الأقسام"
        onKeyDown={onKeyDown}
        className="-mx-4 flex min-w-0 gap-2 overflow-x-auto overflow-y-hidden px-4 sm:mx-0 sm:gap-9 sm:px-0 sm:shadow-[inset_0_-1px_0_rgb(255_255_255/0.1)]"
      >
        {sections.map((s) => {
          const selected = s.slug === current.slug;
          const fresh = newCount(s);
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
              className={`flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-[15px] font-semibold transition-colors sm:min-h-14 sm:rounded-none sm:border-0 sm:border-b-2 sm:px-1 sm:text-lg ${
                selected
                  ? "border-gold bg-accent text-accent-ink sm:border-gold sm:bg-transparent sm:text-text"
                  : "border-line-strong text-text hover:border-gold/40 sm:border-transparent sm:text-muted sm:hover:text-text"
              }`}
            >
              {s.title}
              {fresh > 0 && (
                <span className="h-2 w-2 shrink-0 rounded-full bg-accent" title={`${toArabicDigits(fresh)} جديد منذ زيارتك الأخيرة`}>
                  <span className="sr-only">({toArabicDigits(fresh)} جديد)</span>
                </span>
              )}
              <span
                className={`rounded-full px-2 text-xs font-medium leading-5 ${
                  selected ? "bg-accent-ink/10 text-accent-ink sm:bg-gold/15 sm:text-gold-soft" : "bg-fg/5 text-muted"
                }`}
              >
                {toArabicDigits(s.total)}
              </span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={panelId} aria-labelledby={tabId(current.slug)} className="flex flex-col gap-4">
        <RecordingList
          key={current.slug}
          items={shown}
          mobileRows
          more={{
            href: `/${current.slug}`,
            label: `عرض كل ${current.title}`,
            remaining: Math.max(0, current.total - shown.length),
          }}
        />
        <Link
          href={`/${current.slug}`}
          className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-line-strong text-[15px] font-semibold text-gold transition-colors hover:border-gold/50 sm:hidden"
        >
          عرض كل {current.title} ({toArabicDigits(current.total)})
          <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
        </Link>
      </div>
    </section>
  );
}