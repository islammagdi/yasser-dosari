"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Category, Recording } from "@/types";
import { toArabicDigits } from "@/lib/format";
import { RecordingList } from "./RecordingList";
import { SearchIcon } from "./icons";

interface Group {
  slug: Category;
  title: string;
  total: number;
  items: Recording[];
}

const PREVIEW = 10;

export function SearchView() {
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  // بنستنى ربع ثانية بعد آخر حرف قبل ما نبحث، وبنحدّث الرابط عشان البحث يتشارك
  useEffect(() => {
    const q = query.trim();
    const t = window.setTimeout(async () => {
      router.replace(q ? `/search?q=${encodeURIComponent(q)}` : "/search", { scroll: false });
      if (q.length < 2) {
        setGroups(null);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) throw new Error(`search ${res.status}`);
        const data = (await res.json()) as { groups: Group[] };
        setGroups(data.groups);
        setFailed(false);
        setExpanded({});
      } catch (err) {
        console.error(err);
        setGroups([]);
        setFailed(true);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [query, router]);

  const total = groups?.reduce((n, g) => n + g.total, 0) ?? 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">البحث</h1>
        <label className="relative block w-full max-w-2xl">
          <span className="sr-only">ابحث في كل التلاوات</span>
          <SearchIcon className="pointer-events-none absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="اسم سورة، صلاة، تاريخ، عنوان خطبة…"
            className="glass-card min-h-14 w-full rounded-full pe-5 ps-14 text-lg text-text transition-colors placeholder:text-muted/70 focus:border-gold/60"
          />
        </label>
        <p className="px-1 text-sm text-muted" aria-live="polite">
          {loading
            ? "جارٍ البحث…"
            : failed
              ? "تعذّر البحث الآن. حاول مرة أخرى بعد قليل."
            : groups === null
              ? "يبحث في الفروض والمصحف والتراويح والخطب مرة واحدة."
              : total
                ? `عدد النتائج: ${toArabicDigits(total)}`
                : "لا توجد نتائج. جرّب كلمة أخرى."}
        </p>
      </div>

      {groups?.map((g) => {
        const open = expanded[g.slug];
        const shown = open ? g.items : g.items.slice(0, PREVIEW);
        return (
          <section key={g.slug} aria-labelledby={`r-${g.slug}`} className="flex flex-col gap-4">
            <div className="flex items-center gap-4 px-1">
              <h2 id={`r-${g.slug}`} className="font-display text-2xl font-bold text-gold-soft">
                {g.title}
              </h2>
              <span className="rounded-full bg-fg/5 px-2.5 text-sm leading-6 text-muted">{toArabicDigits(g.total)}</span>
              <span aria-hidden className="h-px flex-1 bg-gradient-to-l from-gold/30 to-transparent" />
            </div>
            <RecordingList key={`${g.slug}-${open}`} items={shown} numbered={g.slug === "mushaf"} />
            {g.items.length > PREVIEW && !open && (
              <button
                type="button"
                onClick={() => setExpanded((e) => ({ ...e, [g.slug]: true }))}
                className="glass-card min-h-11 self-center rounded-full px-6 text-[15px] text-gold-soft transition-colors hover:border-gold/50"
              >
                عرض {toArabicDigits(g.items.length - PREVIEW)} نتيجة أخرى
              </button>
            )}
            {g.total > g.items.length && (
              <Link href={`/${g.slug}`} className="self-center text-sm text-muted underline-offset-4 hover:underline">
                باقي النتائج في صفحة {g.title}
              </Link>
            )}
          </section>
        );
      })}
    </div>
  );
}