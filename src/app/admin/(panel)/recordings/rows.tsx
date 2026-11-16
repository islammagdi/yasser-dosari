"use client";

import { useState, useTransition } from "react";
import type { CatalogEntry } from "@/lib/admin/catalog";
import { classifyPending, deletePending, refreshManifest, syncFromPlaylists, updateEntry, type ActionResult } from "../../actions";
import { CoverUpload } from "../CoverUpload";

const SECTION_OPTIONS = [
  { value: "fard", label: "الفروض" },
  { value: "taraweeh", label: "التراويح" },
  { value: "lectures:khutbah", label: "خطب الجمعة" },
  { value: "lectures:lesson", label: "دروس ومحاضرات" },
  { value: "rare", label: "تلاوات نادرة" },
];
const field = "min-h-11 rounded-xl border border-line-strong bg-ink px-3 text-text";
const sectionOf = (e: CatalogEntry) => (e.category === "lectures" ? `lectures:${e.lectureType ?? "lesson"}` : e.category);
const mins = (s?: number) => (s ? `${Math.round(s / 60)} د` : "");

function Status({ r }: { r: ActionResult | null }) {
  if (!r) return null;
  return <span className={`text-sm ${r.ok ? "text-gold-soft" : "text-[#E5636B]"}`}>{r.message}</span>;
}

export function SyncButton({ label }: { label: string }) {
  const [pending, start] = useTransition();
  const [r, setR] = useState<ActionResult | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => setR(await syncFromPlaylists()))}
        className="min-h-11 self-start rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink hover:bg-accent-hover disabled:opacity-50"
      >
        {pending ? "جارٍ الجلب من يوتيوب… (قد يستغرق دقيقة)" : label}
      </button>
      <Status r={r} />
    </div>
  );
}

export function RefreshManifestButton() {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => refreshManifest())}
      className="min-h-9 text-gold-soft underline-offset-4 hover:underline disabled:opacity-50"
    >
      {pending ? "جارٍ التحديث…" : "تحديث القائمة"}
    </button>
  );
}

export function PendingRow({ id, title, duration }: { id: string; title?: string; duration?: number }) {
  const [section, setSection] = useState("fard");
  const [name, setName] = useState(title ?? "");
  const [pending, start] = useTransition();
  const [r, setR] = useState<ActionResult | null>(null);
  const [deleted, setDeleted] = useState(false);
  if (deleted)
    return <li className="rounded-2xl border border-dashed border-line p-4 text-sm text-muted">اتمسح «{name || title || id}» نهائيًا.</li>;
  // اتصنّف: نعرض رابط إرسال إشعار عنه
  if (r?.ok)
    return (
      <li className="flex flex-wrap items-center gap-3 rounded-2xl border border-gold/30 bg-gold/5 p-4 text-sm">
        <span>✓ تم تصنيف «{name || title || id}»</span>
        {section !== "hidden" && (
          <a
            href={`/admin/notify?id=${id.startsWith("custom-") ? id : `yt-${id}`}`}
            className="font-semibold text-gold-soft underline-offset-4 hover:underline"
          >
            أرسل إشعارًا عنه
          </a>
        )}
      </li>
    );

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-line p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold">{title || "بدون عنوان"}</span>
        <span className="text-xs text-muted">
          {mins(duration)} ·{" "}
          {id.startsWith("custom-") ? (
            <span>تسجيل خاص: {id.slice(7)}</span>
          ) : (
            <a
              href={`https://www.youtube.com/watch?v=${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-soft underline-offset-4 hover:underline"
            >
              {id}
            </a>
          )}
        </span>
      </div>
      {!title && (
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={
            id.startsWith("custom-")
              ? "عنوان التسجيل (اكتب فيه التاريخ والسورة لو تحب: «من سورة الرحمن | 12-9-1446»)"
              : "اكتب العنوان كما في يوتيوب"
          }
          className={field}
        />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <select value={section} onChange={(e) => setSection(e.target.value)} className={field}>
          {SECTION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
          <option value="hidden">إخفاء (لا يظهر في الموقع)</option>
        </select>
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => setR(await classifyPending(id, section, name)))}
          className="min-h-11 rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "جارٍ الحفظ…" : "حفظ"}
        </button>
        {id.startsWith("custom-") && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(`مسح «${name || title || id}» نهائيًا؟ الملف هيتمسح من R2 ومش هيرجع.`)) return;
              start(async () => {
                const res = await deletePending(id);
                if (res.ok) setDeleted(true);
                else setR(res);
              });
            }}
            className="min-h-11 rounded-full border border-[#E5636B]/50 px-5 text-sm font-semibold text-[#E5636B] hover:bg-[#E5636B]/10 disabled:opacity-50"
          >
            مسح نهائي
          </button>
        )}
        <Status r={r} />
      </div>
    </li>
  );
}

/** embedded: جوه جدول التسجيلات (مفتوح على طول ومن غير سطر العنوان) */
export function EntryRow({
  id,
  entry,
  embedded = false,
  hasCover = false,
}: {
  id: string;
  entry: CatalogEntry;
  embedded?: boolean;
  hasCover?: boolean;
}) {
  const [open, setOpen] = useState(embedded);
  // جوه خلية جدول مينفعش li
  const Wrap = embedded ? "div" : "li";
  const [section, setSection] = useState(sectionOf(entry));
  const [title, setTitle] = useState(entry.title ?? "");
  const [subtitle, setSubtitle] = useState(entry.subtitle ?? "");
  const [y, setY] = useState(entry.hijriYear ?? "");
  const [m, setM] = useState(entry.hijriMonth ?? "");
  const [d, setD] = useState(entry.hijriDay ?? "");
  const [hidden, setHidden] = useState(!!entry.hidden);
  const [pending, start] = useTransition();
  const [r, setR] = useState<ActionResult | null>(null);
  const label = entry.title || entry.prayerLabel || id;
  const date = entry.hijriYear ? `${entry.hijriDay ?? "؟"}/${entry.hijriMonth ?? "؟"}/${entry.hijriYear}` : "";
  const toNum = (v: string | number) => (v === "" ? null : Number(v));

  return (
    <Wrap className={embedded ? undefined : `rounded-2xl border p-4 ${hidden ? "border-dashed border-line opacity-70" : "border-line"}`}>
      {!embedded && (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex w-full flex-wrap items-center justify-between gap-2 text-start"
        >
          <span className="flex min-w-0 flex-col">
            <span className="font-semibold">{label}</span>
            {entry.subtitle && <span className="truncate text-sm text-muted">{entry.subtitle}</span>}
          </span>
          <span className="text-xs text-muted">
            {SECTION_OPTIONS.find((o) => o.value === sectionOf(entry))?.label} {date && `· ${date}`} {hidden && "· مخفي"}
          </span>
        </button>
      )}

      {open && (
        <div className={`flex flex-col gap-3 text-sm ${embedded ? "" : "mt-4 border-t border-line pt-4"}`}>
          {id.startsWith("custom-") && (
            <div className="flex flex-wrap items-center gap-2">
              <span>الغلاف:</span>
              <CoverUpload id={id} hasCover={hasCover} />
            </div>
          )}
          <label className="flex flex-col gap-1">
            القسم
            <select value={section} onChange={(e) => setSection(e.target.value)} className={field}>
              {SECTION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            العنوان {entry.category === "fard" && <span className="text-xs text-muted">(الفروض تُعرض باسم الصلاة، فاتركه فارغًا عادةً)</span>}
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={field} />
          </label>
          <label className="flex flex-col gap-1">
            الوصف
            <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className={field} />
          </label>
          <div className="flex flex-wrap gap-2">
            <label className="flex flex-col gap-1">
              اليوم
              <input type="number" value={d} onChange={(e) => setD(e.target.value)} className={`${field} w-20`} />
            </label>
            <label className="flex flex-col gap-1">
              الشهر
              <input type="number" value={m} onChange={(e) => setM(e.target.value)} className={`${field} w-20`} />
            </label>
            <label className="flex flex-col gap-1">
              السنة الهجرية
              <input type="number" value={y} onChange={(e) => setY(e.target.value)} className={`${field} w-28`} />
            </label>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} className="h-5 w-5 accent-[#CDAA62]" />
            إخفاء من الموقع
          </label>
          {entry.searchText && <p className="text-xs text-muted">العنوان الأصلي: {entry.searchText}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () =>
                  setR(
                    await updateEntry(id, {
                      section,
                      title,
                      subtitle,
                      hijriYear: toNum(y),
                      hijriMonth: toNum(m),
                      hijriDay: toNum(d),
                      hidden,
                    }),
                  ),
                )
              }
              className="min-h-11 rounded-full bg-accent px-6 font-semibold text-accent-ink hover:bg-accent-hover disabled:opacity-50"
            >
              {pending ? "جارٍ الحفظ…" : "حفظ"}
            </button>
            {!id.startsWith("custom-") && (
              <a
                href={`https://www.youtube.com/watch?v=${id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold-soft underline-offset-4 hover:underline"
              >
                فتح في يوتيوب
              </a>
            )}
            <Status r={r} />
          </div>
        </div>
      )}
    </Wrap>
  );
}

/** صف في جدول التسجيلات، والضغط على «تعديل» بيفتح فورم التعديل تحته */
export function EntryTableRow({ id, entry, cover }: { id: string; entry: CatalogEntry; cover: string | null }) {
  const [open, setOpen] = useState(false);
  const label = entry.title || entry.prayerLabel || id;
  const date = entry.hijriYear ? `${entry.hijriDay ?? "؟"}/${entry.hijriMonth ?? "؟"}/${entry.hijriYear}` : "—";
  const td = "px-3 py-2.5 align-middle";
  return (
    <>
      <tr className={`border-t border-line ${entry.hidden ? "opacity-60" : ""}`}>
        <td className={td}>
          {cover ? (
            // صورة عادية من غير تحسين Vercel (عشان متستهلكش الحصة)
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" loading="lazy" className="h-11 w-11 rounded-lg object-cover" />
          ) : (
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-fg/5 text-xs text-muted" title="من غير غلاف">
              —
            </span>
          )}
        </td>
        <td className={`${td} max-w-[260px]`}>
          <span className="line-clamp-2 font-semibold">{label}</span>
        </td>
        <td className={`${td} max-w-[260px] text-muted`}>
          <span className="line-clamp-2">{entry.subtitle || "—"}</span>
        </td>
        <td className={`${td} whitespace-nowrap tabular-nums`}>{date}</td>
        <td className={`${td} whitespace-nowrap`}>{SECTION_OPTIONS.find((o) => o.value === sectionOf(entry))?.label}</td>
        <td className={td}>
          <span
            className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${entry.hidden ? "bg-fg/10 text-muted" : "bg-accent/15 text-accent dark:text-gold"}`}
          >
            {entry.hidden ? "مخفي" : "ظاهر"}
          </span>
        </td>
        <td className={td}>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            className="min-h-10 whitespace-nowrap rounded-full border border-line-strong px-4 text-sm font-semibold hover:border-gold/60"
          >
            {open ? "إغلاق" : "تعديل"}
          </button>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={7} className="bg-fg/[0.03] px-4 py-4">
            <EntryRow id={id} entry={entry} embedded hasCover={!!cover} />
          </td>
        </tr>
      )}
    </>
  );
}
