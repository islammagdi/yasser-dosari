"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ImamateSlot } from "@/types";
import { googleCalendarUrl, icsFile, imamateEvent } from "@/lib/calendar";

const MENU_W = 224; // w-56
const MENU_H = 110; // تقريبًا: عنصرين × 44 + padding
const GAP = 8;

/** "ذكّرني": يضيف موعد الإمامة لتقويم Google أو تقويم الجهاز (آيفون وغيره) */
export function ImamateReminder({ slot }: { slot: ImamateSlot }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // مكان القايمة: محاذية لطرف الزرار اليمين (RTL)، وتفتح لفوق لو مفيش مساحة تحت
  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const left = Math.min(Math.max(GAP, r.right - MENU_W), vw - MENU_W - GAP);
    const below = r.bottom + GAP;
    const top = below + MENU_H > vh ? Math.max(GAP, r.top - GAP - MENU_H) : below;
    setPos({ top, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!btnRef.current?.contains(t) && !menuRef.current?.contains(t)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, { passive: true, capture: true });
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, { capture: true });
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const event = () => imamateEvent(slot, window.location.origin);

  const downloadIcs = () => {
    const url = URL.createObjectURL(icsFile(event(), slot.id));
    const a = document.createElement("a");
    a.href = url;
    a.download = "imamah.ics";
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setOpen(false);
  };

  const item = "flex min-h-11 w-full items-center rounded-xl px-3 text-start text-sm transition-colors hover:bg-fg/5";

  return (
    <div className="self-start">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className="mt-1 flex min-h-9 items-center gap-1.5 rounded-full border border-gold/40 px-3 text-xs font-medium text-gold-soft transition-colors hover:border-gold hover:bg-gold/10"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15Z" />
          <path d="M10 20.5a2 2 0 0 0 4 0" />
        </svg>
        ذكّرني بالموعد
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            dir="rtl"
            style={{ position: "fixed", top: pos.top, left: pos.left, width: MENU_W }}
            className="glass-card z-[100] rounded-2xl p-1.5 shadow-float"
          >
            <a
              href={googleCalendarUrl(event())}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className={item}
            >
              تقويم Google
            </a>
            <button type="button" onClick={downloadIcs} className={item}>
              تقويم الجهاز (آيفون وغيره)
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}