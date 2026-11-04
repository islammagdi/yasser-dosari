"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { renderAyahImage, type ImageFormat } from "@/lib/ayahImage";
import { toArabicDigits } from "@/lib/format";
import { surahName } from "@/lib/quran";

/** التفسير بيتحمّل مرة لكل سورة ويفضل في الذاكرة طول الزيارة */
const tafsirCache = new Map<number, Promise<string[]>>();
function loadTafsir(surah: number): Promise<string[]> {
  let p = tafsirCache.get(surah);
  if (!p) {
    p = fetch(`/api/tafsir/${surah}`).then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json() as Promise<string[]>;
    });
    p.catch(() => tafsirCache.delete(surah));
    tafsirCache.set(surah, p);
  }
  return p;
}

interface Props {
  surah: number;
  ayah: number;
  text: string;
  bookmarked: boolean;
  onToggleBookmark: () => void;
  onClose: () => void;
}

/** قايمة الآية: التفسير الميسر، العلامة، النسخ، صورة للمشاركة، والاستماع مع التكرار */
export function AyahSheet({ surah, ayah, text, bookmarked, onToggleBookmark, onClose }: Props) {
  const [view, setView] = useState<"main" | "image">("main");
  const [tafsir, setTafsir] = useState<string | null | "error">(null);
  const [copied, setCopied] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const ref = `سورة ${surahName(surah)} · الآية ${toArabicDigits(ayah)}`;

  useEffect(() => {
    let alive = true;
    setTafsir(null);
    loadTafsir(surah)
      .then((list) => alive && setTafsir(list[ayah - 1] ?? "error"))
      .catch(() => alive && setTafsir("error"));
    return () => {
      alive = false;
    };
  }, [surah, ayah]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${text} ﴿${toArabicDigits(ayah)}﴾\n[${ref}]`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* المتصفح رفض */
    }
  };

  const action =
    "flex min-h-[64px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 px-2 text-xs transition-colors hover:border-gold/40 hover:bg-white/5";

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center" dir="rtl">
      <button type="button" aria-label="إغلاق" tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ref}
        className="relative flex max-h-[88vh] w-full max-w-xl flex-col gap-5 overflow-y-auto rounded-t-3xl border border-white/10 bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-float sm:rounded-3xl sm:p-7"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold text-gold-soft">{ref}</span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-muted transition-colors hover:bg-white/5 hover:text-text"
          >
            ✕
          </button>
        </div>

        {view === "main" ? (
          <>
            <p className="font-quran text-2xl leading-[2.1]">
              {text} <span className="text-gold/80">﴿{toArabicDigits(ayah)}﴾</span>
            </p>

            <div className="grid grid-cols-4 gap-2">
              <button type="button" onClick={onToggleBookmark} aria-pressed={bookmarked} className={`${action} ${bookmarked ? "border-gold/60 text-gold-soft" : ""}`}>
                <span aria-hidden className="text-lg">{bookmarked ? "★" : "☆"}</span>
                {bookmarked ? "شيل العلامة" : "علامة هنا"}
              </button>
              <button type="button" onClick={copy} className={action}>
                <span aria-hidden className="text-lg">⧉</span>
                {copied ? "اتنسخت" : "نسخ"}
              </button>
              <button type="button" onClick={() => setView("image")} className={action}>
                <span aria-hidden className="text-lg">▣</span>
                صورة
              </button>
              <Link href={`/mushaf/mushaf-${String(surah).padStart(3, "0")}?from=${ayah}&to=${ayah}#ayahs`} className={action}>
                <span aria-hidden className="text-lg">⟲</span>
                استمع وكرّر
              </Link>
            </div>

            <section aria-label="التفسير الميسر" className="flex flex-col gap-2 border-t border-white/10 pt-4">
              <h3 className="text-sm font-semibold text-gold-soft">التفسير الميسر</h3>
              {tafsir === null && <p className="text-sm text-muted">جارٍ التحميل…</p>}
              {tafsir === "error" && <p className="text-sm text-muted">تعذّر تحميل التفسير الآن.</p>}
              {tafsir && tafsir !== "error" && <p className="leading-loose text-text/90">{tafsir}</p>}
              <p className="text-xs text-muted">التفسير الميسر، مجمع الملك فهد لطباعة المصحف الشريف.</p>
            </section>
          </>
        ) : (
          <AyahImagePanel surah={surah} ayah={ayah} text={text} onBack={() => setView("main")} />
        )}
      </div>
    </div>,
    document.body,
  );
}

function AyahImagePanel({ surah, ayah, text, onBack }: { surah: number; ayah: number; text: string; onBack: () => void }) {
  const [format, setFormat] = useState<ImageFormat>("square");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    let made: string | null = null;
    setBlob(null);
    setFailed(false);
    renderAyahImage({ surah, ayah, text, format, site: window.location.host })
      .then((b) => {
        if (!alive) return;
        made = URL.createObjectURL(b);
        setBlob(b);
        setUrl(made);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [surah, ayah, text, format]);

  const fileName = `ayah-${surah}-${ayah}${format === "story" ? "-story" : ""}.png`;
  const file = blob ? new File([blob], fileName, { type: "image/png" }) : null;
  const canShare = !!file && typeof navigator !== "undefined" && !!navigator.canShare?.({ files: [file] });

  const download = () => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
  };

  const share = async () => {
    if (!file) return;
    try {
      await navigator.share({ files: [file], title: `سورة ${surahName(surah)}، الآية ${toArabicDigits(ayah)}` });
    } catch {
      /* المستخدم لغى */
    }
  };

  const tab = (f: ImageFormat, label: string) => (
    <button
      type="button"
      onClick={() => setFormat(f)}
      aria-pressed={format === f}
      className={`min-h-11 flex-1 rounded-full text-sm transition-colors ${format === f ? "bg-gold font-semibold text-gold-ink" : "text-muted hover:text-text"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 rounded-full border border-white/10 p-1">
        {tab("square", "مربع (بوست)")}
        {tab("story", "طولي (ستوري)")}
      </div>

      <div className="flex min-h-[240px] items-center justify-center rounded-2xl bg-black/30 p-3">
        {failed ? (
          <p className="text-sm text-muted">تعذّر تجهيز الصورة.</p>
        ) : blob && url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={`صورة الآية ${toArabicDigits(ayah)} من سورة ${surahName(surah)}`} className={`rounded-xl ${format === "story" ? "max-h-[52vh]" : "max-h-[44vh]"} w-auto`} />
        ) : (
          <p className="text-sm text-muted">جارٍ تجهيز الصورة…</p>
        )}
      </div>

      <div className="flex gap-2">
        {canShare && (
          <button type="button" onClick={share} className="min-h-12 flex-1 rounded-full bg-gold font-semibold text-gold-ink transition-opacity hover:opacity-90">
            مشاركة
          </button>
        )}
        <button
          type="button"
          onClick={download}
          disabled={!url}
          className={`min-h-12 flex-1 rounded-full font-semibold transition-colors disabled:opacity-40 ${
            canShare ? "border border-gold/40 text-gold-soft hover:bg-gold/10" : "bg-gold text-gold-ink hover:opacity-90"
          }`}
        >
          تنزيل
        </button>
      </div>
      <button type="button" onClick={onBack} className="min-h-11 text-sm text-muted hover:text-text">
        رجوع
      </button>
    </div>
  );
}