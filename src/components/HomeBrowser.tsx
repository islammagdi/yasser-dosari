"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { isRamadan } from "@/lib/imamate";
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

/** تابات نصية بخط تحت القسم المختار، و"عرض الكل" في نفس السطر */
export function HomeBrowser({ sections }: { sections: HomeSection[] }) {
  const [active, setActive] = useState<Category | undefined>(sections[0]?.slug);
  const id = useId();
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
    <section id="sections" aria-label="الأقسام" className="flex scroll-mt-24 flex-col gap-6">
      <div className="flex items-end justify-between gap-4 border-b border-white/10">
        <div role="tablist" aria-label="الأقسام" onKeyDown={onKeyDown} className="-mb-px flex min-w-0 gap-1 overflow-x-auto sm:gap-4">
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
                className={`flex min-h-12 shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-2 text-base font-semibold transition-colors sm:text-[17px] ${
                  selected ? "border-gold text-text" : "border-transparent text-muted hover:text-text"
                }`}
              >
                {s.title}
                <span
                  className={`rounded-full px-2 text-xs font-medium leading-5 ${
                    selected ? "bg-gold/15 text-gold-soft" : "bg-white/5 text-muted"
                  }`}
                >
                  {toArabicDigits(s.total)}
                </span>
              </button>
            );
          })}
        </div>
        <Link
          href={`/${current.slug}`}
          className="mb-2 hidden min-h-10 shrink-0 items-center rounded-full px-3 text-[15px] text-gold-soft transition-colors hover:bg-white/5 sm:flex"
        >
          عرض الكل
        </Link>
      </div>

      <div role="tabpanel" id={panelId} aria-labelledby={tabId(current.slug)} className="flex flex-col gap-4">
        <RecordingList key={current.slug} items={current.latest} />
        <Link
          href={`/${current.slug}`}
          className="glass-card flex min-h-12 items-center justify-center rounded-full text-[15px] text-gold-soft sm:hidden"
        >
          عرض كل {current.title}
        </Link>
      </div>
    </section>
  );
}