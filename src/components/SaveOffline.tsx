"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Recording } from "@/types";
import { canSaveOffline, removeOffline, saveOffline, useOffline } from "@/lib/offline";

/** زرار "حفظ للاستماع بدون إنترنت" في صفحة التلاوة */
export function SaveOffline({ recording }: { recording: Recording }) {
  const off = useOffline();
  const [supported, setSupported] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  useEffect(() => setSupported(canSaveOffline(recording)), [recording]);
  if (!supported) return null;

  const saved = off.isSaved(recording.id);
  const save = async () => {
    setError("");
    setProgress(0);
    try {
      await saveOffline(recording, setProgress);
    } catch {
      setError("تعذّر حفظ هذه التلاوة الآن. تأكد من الاتصال وحاول مرة أخرى.");
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      {saved ? (
        <>
          <span className="flex items-center gap-2 font-semibold text-gold-soft">
            <CheckIcon /> محفوظة للاستماع بدون إنترنت
          </span>
          <button type="button" onClick={() => removeOffline(recording.id)} className="min-h-10 text-muted hover:text-text hover:underline">
            إزالة
          </button>
          <Link href="/saved" className="min-h-10 py-2.5 text-gold-soft underline-offset-4 hover:underline">
            المحفوظات
          </Link>
        </>
      ) : (
        <button
          type="button"
          onClick={save}
          disabled={progress !== null}
          className="flex min-h-11 items-center gap-2 rounded-full border border-line-strong px-4 font-semibold text-gold-soft hover:border-gold/50 disabled:opacity-70"
        >
          <DownloadIcon />
          {progress !== null ? `جارٍ الحفظ… ${progress}٪` : "حفظ للاستماع بدون إنترنت"}
        </button>
      )}
      {error && <span className="text-[#E5636B]">{error}</span>}
    </div>
  );
}

const DownloadIcon = () => (
  <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
  </svg>
);
const CheckIcon = () => (
  <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12l5 5L20 7" />
  </svg>
);
