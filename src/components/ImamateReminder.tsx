"use client";

import { useEffect, useRef, useState } from "react";
import type { ImamateSlot } from "@/types";
import { googleCalendarUrl, icsFile, imamateEvent } from "@/lib/calendar";

/** "ذكّرني": يضيف موعد الإمامة لتقويم Google أو تقويم الجهاز (آيفون وغيره) */
export function ImamateReminder({ slot }: { slot: ImamateSlot }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
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

  const item = "flex min-h-11 w-full items-center rounded-xl px-3 text-start text-sm transition-colors hover:bg-white/5";

  return (
    <div ref={ref} className="relative self-start">
      <button
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
      {open && (
        <div className="glass-card absolute top-full z-20 mt-2 w-56 rounded-2xl p-1.5 shadow-float">
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
        </div>
      )}
    </div>
  );
}