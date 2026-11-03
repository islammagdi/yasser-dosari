"use client";

import { useState } from "react";
import { formatDuration } from "@/lib/format";
import { usePlayer } from "./PlayerProvider";

/** مشاركة التلاوة: من الموبايل بقايمة المشاركة، أو واتساب، أو نسخ الرابط. ولو بتسمعها، تقدر تشاركها من الدقيقة دي */
export function ShareBox({ id, title, path }: { id: string; title: string; path: string }) {
  const p = usePlayer();
  const [fromTime, setFromTime] = useState(true);
  const [copied, setCopied] = useState(false);

  const t = p.current?.id === id && p.currentTime > 5 ? Math.floor(p.currentTime) : 0;
  const useTime = fromTime && t > 0;
  const url = () => `${window.location.origin}${path}${useTime ? `?t=${t}` : ""}`;
  const text = useTime ? `${title}، من الدقيقة ${formatDuration(t)}` : title;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* المتصفح منع النسخ */
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: url() });
      } catch {
        /* المستخدم قفل قايمة المشاركة */
      }
    } else copy();
  };

  const btn = "flex min-h-11 items-center gap-2 rounded-full px-5 text-[15px] transition-colors";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={share} className={`${btn} glass-card text-text hover:border-gold/50`}>
          <svg aria-hidden viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" />
            <path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6" />
          </svg>
          مشاركة
        </button>
        <button
          type="button"
          onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url()}`)}`, "_blank", "noopener,noreferrer")}
          className={`${btn} glass-card text-text hover:border-gold/50`}
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor">
            <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3a.5.5 0 0 0 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.7a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.6-.3Z" />
          </svg>
          واتساب
        </button>
        <button type="button" onClick={copy} className={`${btn} glass-card text-text hover:border-gold/50`} aria-live="polite">
          {copied ? "تم النسخ ✓" : "نسخ الرابط"}
        </button>
      </div>
      {t > 0 && (
        <label className="flex min-h-11 cursor-pointer items-center gap-3 self-start text-[15px] text-muted">
          <input
            type="checkbox"
            checked={fromTime}
            onChange={(e) => setFromTime(e.target.checked)}
            className="h-5 w-5 accent-[#CDAA62]"
          />
          شارك من الدقيقة {formatDuration(t)}
        </label>
      )}
    </div>
  );
}