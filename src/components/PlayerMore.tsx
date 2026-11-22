"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Recording } from "@/types";
import { getCategory } from "@/lib/playerLabels";
import { toArabicDigits } from "@/lib/format";
import { canSaveOffline, removeOffline, saveOffline, useOffline } from "@/lib/offline";
import { usePlaylists } from "@/lib/usePlaylists";
import { usePlayer } from "./PlayerProvider";
import { RecordingCover } from "./RecordingCover";

/** المشاركة والتحميل من غير نت: مشتركين بين المشغّل الكبير وشريط الديسكتوب */
export function usePlayerActions(r: Recording | null) {
  const off = useOffline();
  const [saving, setSaving] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const saved = !!r && off.isSaved(r.id);

  const flash = (t: string) => {
    setNote(t);
    window.setTimeout(() => setNote(""), 2200);
  };

  const toggleOffline = async () => {
    if (!r) return;
    if (saved) return removeOffline(r.id);
    setSaving(0);
    try {
      await saveOffline(r, (pct) => setSaving(pct));
      flash("اتحفظت على جهازك");
    } catch {
      flash("تعذّر الحفظ دلوقتي");
    } finally {
      setSaving(null);
    }
  };

  const share = async () => {
    if (!r) return;
    const url = `${window.location.origin}/${r.category}/${r.id}`;
    const title = r.title || r.prayerLabel || "";
    try {
      if (navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        flash("اتنسخ الرابط");
      }
    } catch {
      /* المستخدم قفل نافذة المشاركة */
    }
  };

  return { share, toggleOffline, saved, saving, note, canOffline: !!r && canSaveOffline(r) };
}

export const ShareIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="2.5" />
    <circle cx="6" cy="12" r="2.5" />
    <circle cx="18" cy="19" r="2.5" />
    <path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4" />
  </svg>
);

export const DownloadIcon = ({ done, className = "h-5 w-5" }: { done?: boolean; className?: string }) => (
  <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {done ? <path d="M5 12l5 5L20 7" /> : <path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" />}
  </svg>
);

export const RepeatIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 2l4 4-4 4" />
    <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
    <path d="M7 22l-4-4 4-4" />
    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
  </svg>
);

export const MoreIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg aria-hidden viewBox="0 0 24 24" className={className} fill="currentColor">
    <circle cx="12" cy="5" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="12" cy="19" r="1.8" />
  </svg>
);

/**
 * زرار ⋮ في المشغّل (زي أنغامي): التكرار، والإضافة لقايمة تشغيل، وصفحة التلاوة والقسم.
 * التايمر والتالي ليهم أزرار في المشغّل نفسه، فمش بيتكرروا هنا.
 * sheet: لوحة من تحت (المشغّل الكبير). popover: قايمة صغيرة لفوق (شريط الديسكتوب).
 */
export function PlayerMenu({
  variant,
  onNavigate,
  className = "",
}: {
  variant: "sheet" | "popover";
  /** قبل الانتقال لصفحة (عشان المشغّل الكبير يقفل) */
  onNavigate?: () => void;
  className?: string;
}) {
  const p = usePlayer();
  const pl = usePlaylists();
  const r = p.current;
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"main" | "playlists">("main");
  const [newName, setNewName] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  useEffect(() => {
    if (open) setView("main");
  }, [open]);

  if (!r) return null;
  const repeating = p.repeat > 0;
  const go = () => {
    setOpen(false);
    onNavigate?.();
  };
  const row = "flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-start text-[15px] transition-colors hover:bg-fg/5";
  const inLists = pl.lists.filter((l) => l.items.some((x) => x.id === r.id)).length;

  const panel = (
    <div
      role="menu"
      className={
        variant === "sheet"
          ? "fixed inset-x-0 bottom-0 z-[70] max-h-[80dvh] overflow-y-auto rounded-t-3xl border-t border-fg/10 bg-raised p-3 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-float"
          : "absolute bottom-full end-0 z-50 mb-3 max-h-[70vh] w-72 overflow-y-auto rounded-2xl border border-fg/10 bg-raised p-2 shadow-float"
      }
    >
      {variant === "sheet" && (
        <div className="mb-2 flex items-center gap-3 border-b border-fg/10 px-2 pb-3">
          <RecordingCover recording={r} sizes="56px" className="h-14 w-14 shrink-0 rounded-xl" />
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-semibold">{r.title || r.prayerLabel}</span>
            {r.subtitle && <span className="truncate text-sm text-muted">{r.subtitle}</span>}
          </div>
        </div>
      )}

      {view === "main" && (
        <>
          {variant === "sheet" && (
          <button type="button" role="menuitemcheckbox" aria-checked={repeating} onClick={() => p.setRepeat(repeating ? 0 : Infinity)} className={row}>
            <RepeatIcon className={`h-5 w-5 ${repeating ? "text-gold" : "text-muted"}`} />
            <span className="flex-1">تكرار التلاوة</span>
            <span className={`text-xs font-semibold ${repeating ? "text-gold" : "text-muted"}`}>{repeating ? "شغال" : "مقفول"}</span>
          </button>
          )}
          <button type="button" role="menuitem" onClick={() => setView("playlists")} className={row}>
            <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 6h11M4 11h11M4 16h7M17 13v6M14 16h6" />
            </svg>
            <span className="flex-1">إضافة لقايمة تشغيل</span>
            {inLists > 0 && <span className="text-xs text-gold">في {toArabicDigits(inLists)}</span>}
          </button>
          <div className="my-1 h-px bg-fg/10" />
          <Link href={`/${r.category}/${r.id}`} role="menuitem" onClick={go} className={row}>
            <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M9 18l6-6-6-6" transform="translate(24 0) scale(-1 1)" />
            </svg>
            صفحة التلاوة
          </Link>
          <Link href={`/${r.category}`} role="menuitem" onClick={go} className={row}>
            <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="4" width="16" height="16" rx="3" />
              <path d="M8 9h8M8 13h8M8 17h5" />
            </svg>
            قسم {getCategory(r.category)}
          </Link>
        </>
      )}

      {view === "playlists" && (
        <div className="flex flex-col gap-1">
          <button type="button" onClick={() => setView("main")} className="flex min-h-10 items-center gap-2 px-3 text-sm text-muted hover:text-text">
            ← رجوع
          </button>
          {pl.lists.length === 0 && <p className="px-3 py-2 text-sm text-muted">لسه معندكش قوايم. اعمل واحدة من هنا.</p>}
          {pl.lists.map((l) => {
            const has = l.items.some((x) => x.id === r.id);
            return (
              <label key={l.id} className={`${row} cursor-pointer`}>
                <input type="checkbox" checked={has} onChange={() => pl.toggleItem(l.id, r)} className="h-5 w-5 accent-[#CDAA62]" />
                <span className="flex-1 truncate">{l.name}</span>
              </label>
            );
          })}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newName.trim()) return;
              pl.create(newName.trim(), r);
              setNewName("");
            }}
            className="mt-1 flex gap-2 px-1"
          >
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="اسم قايمة جديدة"
              aria-label="اسم قايمة جديدة"
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-line-strong bg-ink px-3 text-sm"
            />
            <button type="submit" className="min-h-11 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-ink">
              إنشاء
            </button>
          </form>
        </div>
      )}

    </div>
  );

  return (
    <div ref={box} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="المزيد"
        className="flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-fg/5 hover:text-text"
      >
        <MoreIcon />
      </button>
      {open && variant === "sheet" && <div aria-hidden className="fixed inset-0 z-[69] bg-black/40" onClick={() => setOpen(false)} />}
      {open && panel}
    </div>
  );
}
