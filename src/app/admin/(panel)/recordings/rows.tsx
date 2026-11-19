"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { CatalogEntry } from "@/lib/admin/catalog";
import { classifyPending, deletePending, deletePendingMany, refreshManifest, syncFromPlaylists, updateEntry, type ActionResult } from "../../actions";
import { CoverUpload } from "../CoverUpload";
import { SURAH_NAMES } from "@/lib/quran";

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

/**
 * audioUrl: عشان تسمع التسجيل قبل ما تكتب عنوانه وتصنّفه.
 * checked / onCheck: للتحديد والمسح الجماعي.
 */
export function PendingRow({
  id,
  title,
  duration,
  audioUrl,
  checked,
  onCheck,
}: {
  id: string;
  title?: string;
  duration?: number;
  audioUrl?: string;
  checked?: boolean;
  onCheck?: (on: boolean) => void;
}) {
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
    <li className={`flex flex-col gap-3 rounded-2xl border p-4 ${checked ? "border-[#E5636B]/60 bg-[#E5636B]/5" : "border-line"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex min-h-9 cursor-pointer items-center gap-2.5 font-semibold">
          {onCheck && (
            <input type="checkbox" checked={!!checked} onChange={(e) => onCheck(e.target.checked)} className="h-5 w-5 accent-[#E5636B]" aria-label={`تحديد ${title || id}`} />
          )}
          {title || "بدون عنوان"}
        </label>
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
      {audioUrl && (
        // preload="none": الصفحة فيها تسجيلات كتير، فمفيش تحميل غير لما تدوس تشغيل
        <audio controls preload="none" src={audioUrl} className="h-10 w-full max-w-xl" aria-label={`استماع: ${title || id}`} />
      )}
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
  const [surahs, setSurahs] = useState<number[]>(entry.surahs ?? []);
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
          <SurahsPicker value={surahs} onChange={setSurahs} />
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
                      surahs,
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

/** قايمة "بانتظار التصنيف" مع تحديد ومسح جماعي */
export function PendingList({ items }: { items: { id: string; title?: string; duration?: number; audioUrl?: string }[] }) {
  const router = useRouter();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<ActionResult | null>(null);
  const all = sel.size === items.length && items.length > 0;

  const toggle = (id: string, on: boolean) =>
    setSel((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });

  const removeSelected = () => {
    if (!window.confirm(`مسح ${sel.size === 1 ? "التسجيل المحدد" : `الـ ${sel.size} تسجيلات المحددة`} نهائيًا؟ الملفات هتتمسح من R2 ومش هترجع.`)) return;
    start(async () => {
      const r = await deletePendingMany([...sel]);
      setMsg(r);
      if (r.ok) {
        setSel(new Set());
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="sticky top-20 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-raised/95 p-3 text-sm backdrop-blur">
        <label className="flex min-h-10 cursor-pointer items-center gap-2 font-semibold">
          <input
            type="checkbox"
            checked={all}
            onChange={(e) => setSel(e.target.checked ? new Set(items.map((i) => i.id)) : new Set())}
            className="h-5 w-5 accent-[#E5636B]"
          />
          تحديد الكل
        </label>
        <span className="text-muted">{sel.size ? `محدد ${sel.size}` : `${items.length} تسجيل`}</span>
        <button
          type="button"
          onClick={removeSelected}
          disabled={!sel.size || pending}
          className="min-h-10 rounded-full bg-[#E5636B] px-5 font-semibold text-white disabled:opacity-40"
        >
          {pending ? "جارٍ المسح…" : "مسح المحدد"}
        </button>
        {msg && <Status r={msg} />}
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((i) => (
          <PendingRow key={i.id} {...i} checked={sel.has(i.id)} onCheck={(on) => toggle(i.id, on)} />
        ))}
      </ul>
    </div>
  );
}

/**
 * السور اللي في التسجيل بإيدك: لما وصف يوتيوب مش بيقول اسم السورة.
 * لو فاضية، الموقع بيقرا السور من العنوان والوصف زي الأول.
 */
function SurahsPicker({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <span>
        السور اللي في التسجيل <span className="text-xs text-muted">(لو فاضية، بتتقري من الوصف تلقائي)</span>
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {value.map((n) => (
          <span key={n} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-gold/15 pe-1.5 ps-3 text-sm">
            {SURAH_NAMES[n - 1]}
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x !== n))}
              aria-label={`شيل سورة ${SURAH_NAMES[n - 1]}`}
              className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-fg/10"
            >
              ×
            </button>
          </span>
        ))}
        <select
          value=""
          onChange={(e) => {
            const n = Number(e.target.value);
            if (n && !value.includes(n)) onChange([...value, n].sort((a, b) => a - b));
          }}
          aria-label="إضافة سورة"
          className="min-h-9 rounded-full border border-line-strong bg-ink px-3 text-sm"
        >
          <option value="">+ إضافة سورة</option>
          {SURAH_NAMES.map((name, i) => (
            <option key={i} value={i + 1} disabled={value.includes(i + 1)}>
              {i + 1}. {name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
