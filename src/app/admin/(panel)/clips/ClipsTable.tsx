"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import type { Clip } from "@/lib/clips";
import { ask } from "@/lib/confirm";
import { toArabicDigits } from "@/lib/format";
import { surahName } from "@/lib/quran";
import { deleteClip, updateClip, type ActionResult, type ClipInput } from "../../actions";
import { MetaFields, type Rec } from "./ClipForms";

export type ClipItem = Clip & { posterUrl?: string; videoUrl?: string };

type Filter = "all" | "visible" | "hidden" | "unlinked";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "الكل" },
  { value: "visible", label: "ظاهر" },
  { value: "hidden", label: "مخفي" },
  { value: "unlinked", label: "مش مربوط بتسجيل" },
];

const date = (iso: string) => new Date(iso).toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" });

function ayahLabel(c: Clip) {
  if (!c.surah) return "";
  const range = c.ayahFrom ? (c.ayahTo && c.ayahTo !== c.ayahFrom ? `${toArabicDigits(c.ayahFrom)}–${toArabicDigits(c.ayahTo)}` : toArabicDigits(c.ayahFrom)) : "";
  return `${surahName(c.surah)}${range ? ` ${range}` : ""}`;
}

function Poster({ url, className }: { url?: string; className: string }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" loading="lazy" className={`${className} rounded-lg object-cover`} />
  ) : (
    <span className={`${className} flex items-center justify-center rounded-lg bg-fg/5 text-xs text-muted`}>—</span>
  );
}

function StatusPill({ hidden }: { hidden?: boolean }) {
  return hidden ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-line-strong px-2.5 py-0.5 text-xs text-muted">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-muted" />
      مخفي
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-semibold text-gold-soft">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-gold" />
      ظاهر
    </span>
  );
}

/** جدول المقاطع المرفوعة: بحث وفلتر، والتعديل في نافذة */
export function ClipsTable({ clips, recordings }: { clips: ClipItem[]; recordings: Rec[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<ClipItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<ActionResult | null>(null);
  const [, start] = useTransition();
  const recTitle = useMemo(() => new Map(recordings.map((r) => [r.id, r.title])), [recordings]);

  const counts = useMemo(
    () => ({
      all: clips.length,
      visible: clips.filter((c) => !c.hidden).length,
      hidden: clips.filter((c) => c.hidden).length,
      unlinked: clips.filter((c) => !c.recordingId).length,
    }),
    [clips],
  );

  const shown = useMemo(() => {
    const q = query.trim();
    return clips.filter((c) => {
      if (filter === "visible" && c.hidden) return false;
      if (filter === "hidden" && !c.hidden) return false;
      if (filter === "unlinked" && c.recordingId) return false;
      if (q && !`${c.title} ${c.description ?? ""} ${c.sourceName ?? ""}`.includes(q)) return false;
      return true;
    });
  }, [clips, query, filter]);

  const run = (id: string, fn: () => Promise<ActionResult>) => {
    setBusyId(id);
    start(async () => {
      const r = await fn();
      setMsg(r);
      setBusyId(null);
      if (r.ok) router.refresh();
    });
  };

  const toggle = (c: ClipItem) => run(c.id, () => updateClip(c.id, { hidden: !c.hidden }));
  const remove = async (c: ClipItem) => {
    if (await ask(`مسح «${c.title}» نهائيًا؟ الفيديو هيتمسح من R2 ومش هيرجع.`, { confirm: "مسح نهائي", danger: true })) run(c.id, () => deleteClip(c.id));
  };

  const iconBtn = "flex h-10 w-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-fg/5 hover:text-text disabled:opacity-40";

  const actions = (c: ClipItem) => (
    <div className="flex items-center justify-end gap-1">
      <button type="button" onClick={() => setEditing(c)} className="min-h-10 rounded-full border border-line-strong px-4 text-sm font-semibold hover:border-gold/60">
        تعديل
      </button>
      <button type="button" disabled={busyId === c.id} onClick={() => toggle(c)} className={iconBtn} title={c.hidden ? "إظهار على الموقع" : "إخفاء من الموقع"} aria-label={c.hidden ? `إظهار ${c.title}` : `إخفاء ${c.title}`}>
        {c.hidden ? (
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A9.8 9.8 0 0 1 12 5c5 0 9 4.5 10 7a13 13 0 0 1-3 3.9M6.1 6.1A13 13 0 0 0 2 12c1 2.5 5 7 10 7a9.6 9.6 0 0 0 4-.9" />
          </svg>
        ) : (
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12c1-2.5 5-7 10-7s9 4.5 10 7c-1 2.5-5 7-10 7S3 14.5 2 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
      <button type="button" disabled={busyId === c.id} onClick={() => remove(c)} className={`${iconBtn} hover:text-[#E5636B]`} title="مسح" aria-label={`مسح ${c.title}`}>
        <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
        </svg>
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* البحث والفلتر */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="دوّر في العناوين"
          aria-label="بحث في المقاطع"
          className="min-h-11 w-full rounded-full border border-line-strong bg-ink px-4 text-text sm:w-72"
        />
        <div role="tablist" aria-label="فلتر المقاطع" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={`min-h-10 rounded-full px-4 text-sm transition-colors ${
                filter === f.value ? "bg-gold/20 font-semibold text-gold-soft" : "border border-line text-muted hover:text-text"
              }`}
            >
              {f.label} <span className="tabular-nums opacity-70">{toArabicDigits(counts[f.value])}</span>
            </button>
          ))}
        </div>
      </div>

      {msg && (
        <p role="status" className={`text-sm ${msg.ok ? "text-gold-soft" : "text-[#E5636B]"}`}>
          {msg.message}
        </p>
      )}

      {shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line-strong p-6 text-center text-muted">{clips.length ? "مفيش مقاطع بالفلتر ده." : "لسه مفيش مقاطع."}</p>
      ) : (
        <>
          {/* ديسكتوب: جدول */}
          <div className="hidden overflow-hidden rounded-2xl border border-line md:block">
            <table className="w-full text-sm">
              <thead className="bg-fg/5 text-xs text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 text-start font-medium">المقطع</th>
                  <th scope="col" className="px-4 py-3 text-start font-medium">الآيات</th>
                  <th scope="col" className="px-4 py-3 text-start font-medium">التسجيل الكامل</th>
                  <th scope="col" className="px-4 py-3 text-start font-medium">التاريخ</th>
                  <th scope="col" className="px-4 py-3 text-start font-medium">الحالة</th>
                  <th scope="col" className="px-4 py-3">
                    <span className="sr-only">إجراءات</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map((c) => (
                  <tr key={c.id} className={`transition-colors hover:bg-fg/[0.03] ${c.hidden ? "opacity-70" : ""} ${busyId === c.id ? "animate-pulse" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Poster url={c.posterUrl} className="aspect-[9/16] w-11 shrink-0" />
                        <div className="flex min-w-0 max-w-sm flex-col gap-0.5">
                          <span className="truncate font-semibold">{c.title}</span>
                          {(c.sourceName || c.description) && <span className="truncate text-xs text-muted">{c.sourceName || c.description}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted">{ayahLabel(c) || "—"}</td>
                    <td className="max-w-[14rem] px-4 py-3">
                      {c.recordingId ? <span className="line-clamp-2 text-text">{recTitle.get(c.recordingId) ?? c.recordingId}</span> : <span className="text-muted">مش مربوط</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{date(c.createdAt)}</td>
                    <td className="px-4 py-3">
                      <StatusPill hidden={c.hidden} />
                    </td>
                    <td className="px-4 py-3">{actions(c)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* موبايل: كروت */}
          <ul className="flex flex-col gap-2 md:hidden">
            {shown.map((c) => (
              <li key={c.id} className={`flex gap-3 rounded-2xl border border-line p-3 ${c.hidden ? "opacity-70" : ""}`}>
                <Poster url={c.posterUrl} className="aspect-[9/16] w-14 shrink-0" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="line-clamp-2 font-semibold">{c.title}</span>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <StatusPill hidden={c.hidden} />
                    <span>{date(c.createdAt)}</span>
                    {ayahLabel(c) && <span>· {ayahLabel(c)}</span>}
                  </div>
                  <span className="truncate text-xs text-muted">{c.recordingId ? `مربوط: ${recTitle.get(c.recordingId) ?? c.recordingId}` : "مش مربوط بتسجيل"}</span>
                  <div className="mt-auto">{actions(c)}</div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {editing && (
        <EditClipDialog
          clip={editing}
          recordings={recordings}
          onClose={() => setEditing(null)}
          onSaved={(r) => {
            setMsg(r);
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

const pick = (c: Clip): ClipInput => ({
  title: c.title,
  description: c.description,
  sourceUrl: c.sourceUrl,
  sourceName: c.sourceName,
  recordingId: c.recordingId,
  surah: c.surah,
  ayahFrom: c.ayahFrom,
  ayahTo: c.ayahTo,
});

/**
 * نافذة تعديل المقطع.
 * الضغط برا النافذة مش بيقفلها، علشان التعديلات متضيعش بضغطة غلط.
 * بتتقفل من «إلغاء» أو ✕ أو Escape، ولو فيه تعديلات مش محفوظة بتسأل الأول.
 */
function EditClipDialog({ clip, recordings, onClose, onSaved }: { clip: ClipItem; recordings: Rec[]; onClose: () => void; onSaved: (r: ActionResult) => void }) {
  const initial = useMemo(() => pick(clip), [clip]);
  const [meta, setMeta] = useState<ClipInput>(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const dirty = JSON.stringify(meta) !== JSON.stringify(initial);

  const tryClose = useCallback(async () => {
    if (pending) return;
    if (dirty && !(await ask("فيه تعديلات مش محفوظة. تقفل من غير حفظ؟", { confirm: "اقفل من غير حفظ", cancel: "ارجع للتعديل", danger: true }))) return;
    onClose();
  }, [dirty, pending, onClose]);

  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>("input,select,textarea")?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      back?.focus?.();
    };
  }, []);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      // لو نافذة التأكيد مفتوحة فوقها، هي اللي بتتعامل مع Escape
      if (e.key === "Escape" && !document.querySelector('[role="alertdialog"]')) tryClose();
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [tryClose]);

  const save = () => {
    setError(null);
    start(async () => {
      const r = await updateClip(clip.id, meta);
      if (r.ok) onSaved(r);
      else setError(r.message);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      {/* الخلفية: مفيش onClick، علشان الضغط برا ميقفلش */}
      <div aria-hidden className="absolute inset-0 bg-[#000]/60" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-float sm:max-w-4xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 id={titleId} className="font-display text-2xl font-bold">
            تعديل المقطع
          </h2>
          <button type="button" onClick={tryClose} aria-label="إغلاق" className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-fg/5 hover:text-text">
            <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5 sm:flex-row">
          {/* معاينة الفيديو */}
          <div className="flex shrink-0 flex-col gap-2 sm:w-52">
            {clip.videoUrl ? (
              <video src={clip.videoUrl} poster={clip.posterUrl} controls playsInline preload="none" className="aspect-[9/16] w-40 self-center rounded-2xl bg-[#000] object-contain sm:w-full" />
            ) : (
              <Poster url={clip.posterUrl} className="aspect-[9/16] w-40 self-center sm:w-full" />
            )}
            <span className="text-center text-xs text-muted">اترفع {date(clip.createdAt)}</span>
          </div>
          <div className="min-w-0 flex-1">
            <MetaFields v={meta} set={(p) => setMeta((m) => ({ ...m, ...p }))} recordings={recordings} disabled={pending} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button type="button" disabled={pending || !dirty} onClick={save} className="min-h-11 rounded-full bg-accent px-6 font-semibold text-accent-ink hover:bg-accent-hover disabled:opacity-50">
            {pending ? "جارٍ الحفظ…" : "حفظ التعديلات"}
          </button>
          <button type="button" disabled={pending} onClick={tryClose} className="min-h-11 rounded-full border border-line-strong px-5 hover:border-gold/60">
            إلغاء
          </button>
          {dirty && !error && <span className="text-sm text-muted">فيه تعديلات مش محفوظة</span>}
          {error && (
            <span role="alert" className="text-sm text-[#E5636B]">
              {error}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
