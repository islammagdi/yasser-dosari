"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Ayah } from "@/lib/api/quranText";
import { renderAyahImage, selectionText, wordsOf, type ImageFormat } from "@/lib/ayahImage";
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
  /** آيات السورة كلها: عشان الصورة تقدر تاخد أكتر من آية */
  ayahs: Ayah[];
  bookmarked: boolean;
  onToggleBookmark: () => void;
  onClose: () => void;
}

/** قايمة الآية: التفسير الميسر، العلامة، النسخ، صورة للمشاركة، والاستماع مع التكرار */
export function AyahSheet({ surah, ayah, text, ayahs, bookmarked, onToggleBookmark, onClose }: Props) {
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
    "flex min-h-[64px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl border border-fg/10 px-2 text-xs transition-colors hover:border-gold/40 hover:bg-fg/5";

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center" dir="rtl">
      <button type="button" aria-label="إغلاق" tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ref}
        className="relative flex max-h-[88vh] w-full max-w-xl flex-col gap-5 overflow-y-auto rounded-t-3xl border border-fg/10 bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-float sm:rounded-3xl sm:p-7"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold text-gold-soft">{ref}</span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-muted transition-colors hover:bg-fg/5 hover:text-text"
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

            <section aria-label="التفسير الميسر" className="flex flex-col gap-2 border-t border-fg/10 pt-4">
              <h3 className="text-sm font-semibold text-gold-soft">التفسير الميسر</h3>
              {tafsir === null && <p className="text-sm text-muted">جارٍ التحميل…</p>}
              {tafsir === "error" && <p className="text-sm text-muted">تعذّر تحميل التفسير الآن.</p>}
              {tafsir && tafsir !== "error" && <p className="leading-loose text-text/90">{tafsir}</p>}
              <p className="text-xs text-muted">التفسير الميسر، مجمع الملك فهد لطباعة المصحف الشريف.</p>
            </section>
          </>
        ) : (
          <AyahImagePanel surah={surah} ayah={ayah} ayahs={ayahs} onBack={() => setView("main")} />
        )}
      </div>
    </div>,
    document.body,
  );
}

/** أقصى عدد آيات في الصورة الواحدة؛ أكتر من كده الخط بيصغر لدرجة صعب تتقري */
const MAX_AYAHS = 10;

function AyahImagePanel({ surah, ayah, ayahs, onBack }: { surah: number; ayah: number; ayahs: Ayah[]; onBack: () => void }) {
  const [format, setFormat] = useState<ImageFormat>("square");
  const [from, setFrom] = useState(ayah);
  const [to, setTo] = useState(ayah);
  // تحديد جزء: أول ضغطة = بداية، تاني ضغطة = نهاية
  const [pick, setPick] = useState<{ start: number; end: number | null } | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [failed, setFailed] = useState(false);

  const total = ayahs.length;
  const words = useMemo(() => wordsOf(ayahs.filter((a) => a.n >= from && a.n <= to)), [ayahs, from, to]);
  const start = pick?.start ?? 0;
  const end = pick ? pick.end ?? pick.start : words.length - 1;
  const sel = words.length ? selectionText(words, Math.min(start, end), Math.max(start, end), surah) : null;

  const changeFrom = (n: number) => {
    setFrom(n);
    if (to < n) setTo(n);
    if (to > n + MAX_AYAHS - 1) setTo(n + MAX_AYAHS - 1);
    setPick(null);
  };
  const changeTo = (n: number) => {
    setTo(n);
    setPick(null);
  };
  const tapWord = (i: number) => {
    if (!pick || pick.end !== null) setPick({ start: i, end: null });
    else setPick({ start: pick.start, end: i });
  };

  useEffect(() => {
    if (!sel) return;
    let alive = true;
    let made: string | null = null;
    setBlob(null);
    setFailed(false);
    renderAyahImage({ body: sel.body, ref: sel.ref, format, site: window.location.host })
      .then((r) => {
        if (!alive) return;
        made = URL.createObjectURL(r.blob);
        setBlob(r.blob);
        setUrl(made);
        setTruncated(r.truncated);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [sel?.body, sel?.ref, format]); // eslint-disable-line react-hooks/exhaustive-deps

  const fileName = `ayah-${surah}-${sel?.first ?? ayah}${sel && sel.last !== sel.first ? `-${sel.last}` : ""}${format === "story" ? "-story" : ""}.png`;
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
    if (!file || !sel) return;
    try {
      await navigator.share({ files: [file], title: sel.ref });
    } catch {
      /* المستخدم لغى */
    }
  };

  const tab = (f: ImageFormat, label: string) => (
    <button
      type="button"
      onClick={() => setFormat(f)}
      aria-pressed={format === f}
      className={`min-h-11 flex-1 rounded-full text-sm transition-colors ${format === f ? "bg-accent font-semibold text-accent-ink" : "text-muted hover:text-text"}`}
    >
      {label}
    </button>
  );

  const select = "min-h-11 rounded-xl border border-fg/10 bg-ink px-3 text-text";
  const lo = Math.min(start, end);
  const hi = Math.max(start, end);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 rounded-full border border-fg/10 p-1">
        {tab("square", "مربع (بوست)")}
        {tab("story", "طولي (ستوري)")}
      </div>

      {/* الآيات: من … إلى … */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="flex items-center gap-2">
          من الآية
          <select value={from} onChange={(e) => changeFrom(Number(e.target.value))} className={select}>
            {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {toArabicDigits(n)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          إلى
          <select value={to} onChange={(e) => changeTo(Number(e.target.value))} className={select}>
            {Array.from({ length: Math.min(MAX_AYAHS, total - from + 1) }, (_, i) => from + i).map((n) => (
              <option key={n} value={n}>
                {toArabicDigits(n)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* جزء من الآيات: اضغط أول كلمة وآخر كلمة */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 text-xs text-muted">
          <span>{pick?.end === null ? "اضغط آخر كلمة" : "لجزء من الآية: اضغط أول كلمة ثم آخر كلمة"}</span>
          {pick && (
            <button type="button" onClick={() => setPick(null)} className="min-h-9 px-2 text-gold-soft hover:underline">
              الكل
            </button>
          )}
        </div>
        <p className="max-h-40 overflow-y-auto rounded-2xl border border-fg/10 p-3 font-quran text-xl leading-[2.2]">
          {words.map((w, i) => {
            const on = i >= lo && i <= hi;
            return (
              <span key={i}>
                <button
                  type="button"
                  onClick={() => tapWord(i)}
                  aria-pressed={on}
                  className={`rounded-md px-0.5 transition-colors ${on ? "text-text" : "text-muted/50"} ${
                    pick && (i === lo || i === hi) ? "bg-gold/20" : "hover:bg-fg/5"
                  }`}
                >
                  {w.text}
                </button>
                {w.last && <span className="text-gold/70"> ﴿{toArabicDigits(w.ayah)}﴾</span>}{" "}
              </span>
            );
          })}
        </p>
      </div>

      <div className="flex min-h-[240px] items-center justify-center rounded-2xl bg-black/30 p-3">
        {failed ? (
          <p className="text-sm text-muted">تعذّر تجهيز الصورة.</p>
        ) : blob && url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={sel?.ref ?? ""} className={`rounded-xl ${format === "story" ? "max-h-[52vh]" : "max-h-[44vh]"} w-auto`} />
        ) : (
          <p className="text-sm text-muted">جارٍ تجهيز الصورة…</p>
        )}
      </div>
      {truncated && (
        <p className="text-sm text-gold-soft">النص أطول من مساحة الصورة، فاتقص آخره. قلّل عدد الآيات أو اختر جزءًا منها.</p>
      )}

      <div className="flex gap-2">
        {canShare && (
          <button type="button" onClick={share} className="min-h-12 flex-1 rounded-full bg-accent font-semibold text-accent-ink transition-opacity hover:opacity-90">
            مشاركة
          </button>
        )}
        <button
          type="button"
          onClick={download}
          disabled={!url}
          className={`min-h-12 flex-1 rounded-full font-semibold transition-colors disabled:opacity-40 ${
            canShare ? "border border-gold/40 text-gold-soft hover:bg-gold/10" : "bg-accent text-accent-ink hover:opacity-90"
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