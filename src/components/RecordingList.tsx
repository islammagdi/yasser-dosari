"use client";

import { useMemo, useState } from "react";
import type { LectureType, Recording } from "@/types";
import { LECTURE_TYPE_LABELS, hijriMonthName } from "@/lib/categories";
import { normalizeArabic, toArabicDigits } from "@/lib/format";
import { matchesSearch, searchTerms } from "@/lib/search";
import { useFavorites } from "@/lib/useFavorites";
import { useKhatma } from "@/lib/useKhatma";
import { usePlayer } from "./PlayerProvider";
import { RecordingCard } from "./RecordingCard";
import { SearchIcon } from "./icons";

interface Props {
  items: Recording[];
  searchable?: boolean;
  /** تابات بالسنين الهجرية (الفروض والتراويح) */
  yearTabs?: boolean;
  /** تقسيم السنة لشهور هجرية (الفروض) */
  groupByMonth?: boolean;
  /** ترقيم برقم السورة أو الليلة (المصحف والتراويح) */
  numbered?: boolean;
  /** فلتر خطب الجمعة والدروس (المحاضرات) */
  typeFilter?: boolean;
  /** عنوان الصفحة: لو موجود بيظهر h1 والبحث جنبه في نفس الصف */
  title?: string;
  /** تابات بالنسخ لو القسم فيه أكتر من تسجيل (المصحف) */
  versionTabs?: boolean;
  /** حاجة إضافية تحت العنوان والفلاتر، زي متابعة الختمة */
  extra?: React.ReactNode;
}
type TypeValue = LectureType | "all";

const TYPE_OPTIONS: { value: TypeValue; label: string }[] = [
  { value: "all", label: "الكل" },
  { value: "khutbah", label: "خطب الجمعة" },
  { value: "lesson", label: "دروس دينية" },
];

interface Group {
  key: string;
  title?: string;
  items: Recording[];
}

function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="max-w-full overflow-x-auto">
      <div role="group" aria-label={label} className="glass-card inline-flex gap-1 rounded-full p-1">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={String(o.value)}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(o.value)}
              className={`min-h-11 shrink-0 whitespace-nowrap rounded-full px-5 text-[15px] transition-colors ${
               active ? "bg-gold font-semibold text-gold-ink" : "text-muted hover:bg-white/5 hover:text-text"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function RecordingList({
  items,
  searchable = false,
  yearTabs = false,
  groupByMonth = false,
  numbered = false,
  typeFilter = false,
  title,
  versionTabs = false,
  extra,
}: Props) {
  const { current, isPlaying, playQueue } = usePlayer();
  const fav = useFavorites();
  const khatma = useKhatma();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TypeValue>("all");
  const [year, setYear] = useState<number | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  const versionOf = (r: Recording) => r.versionLabel ?? "المصحف المرتل";
  const versions = useMemo(() => (versionTabs ? Array.from(new Set(items.map(versionOf))) : []), [items, versionTabs]);
  const activeVersion = versions.length > 1 ? version ?? versions[0] : null;

  const years = useMemo(
    () =>
      Array.from(new Set(items.map((r) => r.hijriYear).filter((y): y is number => !!y))).sort((a, b) => b - a),
    [items],
  );
  // الافتراضي: أحدث سنة
  const activeYear = yearTabs ? year ?? years[0] ?? null : null;

  const groups = useMemo<Group[]>(() => {
    const q = normalizeArabic(query);
    let list = items.filter((r) => {
      if (activeYear != null && r.hijriYear !== activeYear) return false;
      if (activeVersion != null && versionOf(r) !== activeVersion) return false;
      if (type !== "all" && r.lectureType !== type) return false;
      if (q && !matchesSearch(r, searchTerms(query))) return false;
      return true;
    });

    if (numbered) list = [...list].sort((a, b) => (a.surah ?? a.night ?? 0) - (b.surah ?? b.night ?? 0));
    // الفروض جوه الشهر: بالأيام، وجوه اليوم الواحد بترتيب الصلوات
    if (groupByMonth) {
      const order = { fajr: 0, maghrib: 1, isha: 2 } as const;
      list = [...list].sort(
        (a, b) => (a.hijriDay ?? 0) - (b.hijriDay ?? 0) || (a.prayer ? order[a.prayer] : 0) - (b.prayer ? order[b.prayer] : 0),
      );
    }

    // وقت البحث: النتايج كلها في شبكة واحدة من غير تقسيم الشهور، عشان متتفرقش
    if (!groupByMonth || q) return list.length ? [{ key: "all", items: list }] : [];

    const byMonth = new Map<number, Recording[]>();
    for (const r of list) {
      const m = r.hijriMonth ?? 0;
      byMonth.set(m, [...(byMonth.get(m) ?? []), r]);
    }
    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a - b)
      .map(([m, recs]) => ({ key: `m-${m}`, title: hijriMonthName(m) || "شهر غير محدد", items: recs }));
}, [items, query, type, activeYear, activeVersion, numbered, groupByMonth]);

  // قايمة التشغيل = كل اللي ظاهر بنفس ترتيب العرض
  const queue = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const filtered = !!query || type !== "all";
  const hasFilters = typeFilter || (yearTabs && years.length > 0 && activeYear != null) || activeVersion != null;

  const filters = hasFilters && (
    <div className="flex min-w-0 flex-wrap gap-3">
      {yearTabs && years.length > 0 && activeYear != null && (
        <Segmented
          label="السنة الهجرية"
          value={activeYear}
          onChange={setYear}
          options={years.map((y) => ({ value: y, label: `${toArabicDigits(y)} هـ` }))}
        />
      )}
      {typeFilter && <Segmented label="نوع المحاضرة" value={type} onChange={setType} options={TYPE_OPTIONS} />}
      {activeVersion != null && (
        <Segmented label="النسخة" value={activeVersion} onChange={setVersion} options={versions.map((v) => ({ value: v, label: v }))} />
      )}
    </div>
  );

  const search = searchable && (
    <label className="relative w-full sm:w-72">
      <span className="sr-only">ابحث في القسم</span>
      <SearchIcon className="pointer-events-none absolute right-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="ابحث بالسورة أو العنوان"
        className="glass-card min-h-12 w-full rounded-full pe-5 ps-11 text-base text-text transition-colors placeholder:text-muted/70 focus:border-gold/60"
      />
    </label>
  );

  return (
    <div className="flex flex-col gap-6">
      {title ? (
        <>
          {/* العنوان والبحث في صف واحد، والفلاتر تحتهم */}
          <div className="flex flex-wrap items-center justify-between gap-4">
<h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">{title}</h1>
            {search}
          </div>
          {filters}
          {extra}
        </>
      ) : (
        (filters || search) && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            {filters}
            {search}
          </div>
        )
      )}
      {queue.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line-strong px-6 py-12 text-center text-muted">
{filtered ? "لا توجد نتائج. جرّب كلمة أخرى أو غيّر التصفية." : "لا توجد تسجيلات هنا بعد."}
        </p>
      ) : (
        <div className="flex flex-col gap-10">
          {filtered && <p className="-mb-6 px-1 text-sm text-muted">عدد النتائج: {toArabicDigits(queue.length)}</p>}
          {groups.map((g) => (
            <section key={g.key} aria-label={g.title} className="flex flex-col gap-4">
              {g.title && (
                <div className="flex items-center gap-4 px-1">
                  <h3 className="font-display text-2xl font-bold text-gold-soft">{g.title}</h3>
                  <span aria-hidden className="h-px flex-1 bg-gradient-to-l from-gold/30 to-transparent" />
                </div>
              )}
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
                {g.items.map((r) => {
                  const i = queue.indexOf(r);
                  return (
                    <RecordingCard
                      key={r.id}
                      recording={r}
                      position={numbered ? r.surah ?? r.night ?? i + 1 : undefined}
                      badge={r.lectureType ? LECTURE_TYPE_LABELS[r.lectureType] : undefined}
                      isCurrent={current?.id === r.id}
                      isPlaying={isPlaying}
                      onPlay={() => playQueue(queue, i)}
                      favorite={fav.isFavorite(r.id)}
                      listened={r.category === "mushaf" && !!r.surah && khatma.isDone(r.surah)}
                      onToggleFavorite={() => fav.toggle(r.id)}
                    />
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}