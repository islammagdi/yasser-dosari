"use client";

import { useL } from "@/lib/i18n/client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Recording } from "@/types";
import { usePlayer } from "./PlayerProvider";
import { RecordingCover } from "./RecordingCover";
import { EqualizerIcon } from "./icons";
import { lockScroll } from "@/lib/scrollLock";

/** ارتفاع الصف: ثابت، عشان السحب يحسب المكان الجديد من المسافة */
const ROW = 64;

export const QueueIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 6h16M4 11h16M4 16h9" />
    <path d="M17 14.5v5l4-2.5z" fill="currentColor" />
  </svg>
);

const GripIcon = () => (
  <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    {[6, 12, 18].map((y) => (
      <g key={y}>
        <circle cx="9" cy={y} r="1.5" />
        <circle cx="15" cy={y} r="1.5" />
      </g>
    ))}
  </svg>
);

/**
 * قايمة الاستماع (زي «التالي» في أنغامي): التلاوة الشغالة، واللي هيشتغل بعدها بالترتيب.
 * الزائر بيقدر يغيّر الترتيب بالسحب من المقبض (أو بالأسهم من الكيبورد)، يشغّل أي واحدة، أو يشيلها.
 */
export function PlayerQueue({ className = "", label = true }: { className?: string; label?: boolean }) {
  const { t, toArabicDigits } = useL();
  const p = usePlayer();
  const [open, setOpen] = useState(false);
  if (!p.current) return null;
  const upcoming = Math.max(0, p.queue.length - p.queueIndex - 1);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={label ? undefined : t("قايمة الاستماع")}
        className={className}
      >
        <QueueIcon />
        {label && (
          <>
            
            {t("التالي")}
            {upcoming > 0 && <span className="tabular-nums text-gold">{toArabicDigits(upcoming)}</span>}
          </>
        )}
      </button>
      {/* في body مباشرة: شريط المشغّل عليه blur بيحبس أي fixed جواه، وكمان الضغط جوه الشريط بيفتح المشغّل الكبير */}
      {open && createPortal(<QueueSheet onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

function QueueSheet({ onClose }: { onClose: () => void }) {
  const { recTitle, t, recSubtitle } = useL();
  const p = usePlayer();
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const start = p.queueIndex + 1;
  const upcoming = p.queue.slice(start);
  // اللي اتسمع قبل الحالية: بيفضل في القايمة عشان المستمع يرجعله
  const played = p.queue.slice(0, Math.max(0, p.queueIndex));
  const nowRef = useRef<HTMLElement>(null);
  // القايمة بتفتح على «يُشغَّل الآن»، واللي اتسمع فوقه لو حب يطلع
  useEffect(() => {
    nowRef.current?.scrollIntoView({ block: "start" });
  }, []);

  // السحب: رقم الصف اللي بيتسحب (جوه «التالي»)، والمسافة اللي اتحركها
  const [drag, setDrag] = useState<{ from: number; dy: number } | null>(null);
  const startY = useRef(0);
  const target = drag ? Math.max(0, Math.min(upcoming.length - 1, drag.from + Math.round(drag.dy / ROW))) : -1;

  const close = useCallback(() => onClose(), [onClose]);
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const unlockScroll = lockScroll();
    // Escape بيقفل القايمة بس، مش المشغّل الكبير اللي تحتها (capture بيسبق مستمع المشغّل)
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      close();
    };
    window.addEventListener("keydown", esc, true);
    return () => {
      window.removeEventListener("keydown", esc, true);
      unlockScroll();
      back?.focus?.();
    };
  }, [close]);

  // الصفوف التانية بتتزق مكان واحد وإنت بتسحب، عشان تشوف هتنزل فين
  const shift = (i: number) => {
    if (!drag || i === drag.from) return 0;
    if (drag.from < target && i > drag.from && i <= target) return -ROW;
    if (drag.from > target && i < drag.from && i >= target) return ROW;
    return 0;
  };

  const row = (r: Recording, i: number) => {
    const dragging = drag?.from === i;
    const abs = start + i;
    return (
      <li
        key={`${r.id}-${r.clip?.tag ?? ""}-${abs}`}
        style={{
          height: ROW,
          transform: `translateY(${dragging ? drag!.dy : shift(i)}px)`,
          transition: dragging ? "none" : "transform 160ms ease",
          zIndex: dragging ? 2 : 1,
        }}
        className={`relative flex items-center gap-2 rounded-xl px-1 ${dragging ? "bg-raised shadow-float" : ""}`}
      >
        <button type="button" onClick={() => p.playFromQueue(abs)} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-1 text-start hover:bg-fg/5">
          <RecordingCover recording={r} sizes="48px" className="h-12 w-12 shrink-0 rounded-lg" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[15px] font-medium">{recTitle(r)}</span>
            {recSubtitle(r) && <span className="truncate text-xs text-muted">{recSubtitle(r)}</span>}
          </span>
        </button>
        <button
          type="button"
          onClick={() => p.removeFromQueue(abs)}
          aria-label={t("شيل {x} من القايمة", { x: recTitle(r) })}
          className="flex h-11 w-9 shrink-0 items-center justify-center rounded-full text-muted hover:text-text"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
        <button
          type="button"
          aria-label={t("ترتيب {x}: اسحب، أو استخدم الأسهم فوق وتحت", { x: recTitle(r) })}
          className="flex h-11 w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-full text-muted hover:text-text active:cursor-grabbing"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            startY.current = e.clientY;
            setDrag({ from: i, dy: 0 });
          }}
          onPointerMove={(e) => drag?.from === i && setDrag({ from: i, dy: e.clientY - startY.current })}
          onPointerUp={() => {
            if (drag && target !== drag.from) p.moveInQueue(start + drag.from, start + target);
            setDrag(null);
          }}
          onPointerCancel={() => setDrag(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" && i > 0) {
              e.preventDefault();
              p.moveInQueue(abs, abs - 1);
            }
            if (e.key === "ArrowDown" && i < upcoming.length - 1) {
              e.preventDefault();
              p.moveInQueue(abs, abs + 1);
            }
          }}
        >
          <GripIcon />
        </button>
      </li>
    );
  };

  const c = p.current!;
  return (
    // React بيعدّي الأحداث من البورتال للأب (شريط المشغّل)، فبنوقفها هنا
    <div onClick={(e) => e.stopPropagation()} className="fixed inset-0 z-[75] flex items-end justify-center sm:items-center sm:p-4">
      <div aria-hidden className="absolute inset-0 bg-black/50" onClick={close} />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[85dvh] w-full flex-col rounded-t-3xl border border-fg/10 bg-raised text-text shadow-float outline-none sm:max-w-md sm:rounded-3xl"
      >
        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <h2 id={titleId} className="font-display text-2xl font-bold">
            
            {t("قايمة الاستماع")}
          </h2>
          <button type="button" onClick={close} aria-label={t("إغلاق")} className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-fg/5 hover:text-text">
            <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {played.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="px-1 text-xs font-semibold text-muted">{t("اللي اتسمع")}</h3>
              <ol className="flex flex-col">
                {played.map((r, i) => (
                  <li key={`${r.id}-${r.clip?.tag ?? ""}-${i}`} style={{ height: ROW }} className="flex items-center px-1">
                    <button
                      type="button"
                      onClick={() => p.playFromQueue(i)}
                      aria-label={t("شغّل {x} تاني", { x: recTitle(r) })}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-1 text-start opacity-70 transition-opacity hover:bg-fg/5 hover:opacity-100"
                    >
                      <RecordingCover recording={r} sizes="48px" className="h-12 w-12 shrink-0 rounded-lg" />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[15px] font-medium">{recTitle(r)}</span>
                        {recSubtitle(r) && <span className="truncate text-xs text-muted">{recSubtitle(r)}</span>}
                      </span>
                      <svg aria-hidden viewBox="0 0 24 24" className="me-2 h-4 w-4 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                        <path d="M3 3v5h5" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section ref={nowRef} className="flex scroll-mt-2 flex-col gap-2">
            <h3 className="px-1 text-xs font-semibold text-gold">{t("يُشغَّل الآن")}</h3>
            <div className="flex items-center gap-3 rounded-2xl bg-fg/5 p-2">
              <RecordingCover recording={c} sizes="48px" className="h-12 w-12 shrink-0 rounded-lg" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[15px] font-semibold text-gold-soft">{recTitle(c)}</span>
                {recSubtitle(c) && <span className="truncate text-xs text-muted">{recSubtitle(c)}</span>}
              </span>
              {p.isPlaying && <EqualizerIcon className="me-2 h-4 w-4 shrink-0 text-gold" />}
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between px-1">
              <h3 className="text-xs font-semibold text-gold">{t("التالي")}</h3>
              {upcoming.length > 1 && <span className="text-xs text-muted">{t("اسحب من ⠿ عشان ترتّب")}</span>}
            </div>
            {upcoming.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line-strong p-5 text-center text-sm leading-7 text-muted">
                
                {t("مفيش تلاوات بعد دي. شغّل من قسم أو قايمة تشغيل، والباقي هيظهر هنا بالترتيب.")}
              </p>
            ) : (
              <ol className={`flex flex-col ${drag ? "select-none" : ""}`}>{upcoming.map(row)}</ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
