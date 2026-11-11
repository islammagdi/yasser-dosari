"use client";

import { useEffect, useRef, useState } from "react";
import { disablePush, enablePush, pushState, type PushState } from "@/lib/push/client";

/** زرار الجرس في الهيدر: تفعيل وإيقاف إشعارات التلاوات الجديدة */
export function NotificationsButton({ className = "" }: { className?: string }) {
  const [state, setState] = useState<PushState | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    pushState().then(setState).catch(() => setState("unsupported"));
  }, []);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const run = async (fn: () => Promise<PushState>) => {
    setBusy(true);
    setError("");
    try {
      setState(await fn());
    } catch {
      setError("تعذّر تغيير الإعداد الآن. حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={state === "on" ? "الإشعارات مفعّلة" : "الإشعارات"}
        className={className}
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill={state === "on" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      </button>

      {open && (
        <div className="glass absolute end-0 top-full z-50 mt-2 flex w-72 flex-col gap-3 rounded-2xl border border-fg/10 p-4 text-sm shadow-float">
          <p className="font-semibold text-gold-soft">إشعارات التلاوات الجديدة</p>
          {state === "unsupported" && <p className="leading-6 text-muted">متصفحك لا يدعم الإشعارات.</p>}
          {state === "needs-install" && (
            <p className="leading-6 text-muted">
              على الآيفون، تعمل الإشعارات بعد تثبيت الموقع: اضغط زر المشاركة، ثم «إضافة إلى الشاشة الرئيسية»، وافتح الموقع من الأيقونة الجديدة.
            </p>
          )}
          {state === "denied" && <p className="leading-6 text-muted">الإشعارات محظورة لهذا الموقع من إعدادات المتصفح. فعّلها من الإعدادات ثم عُد إلى هنا.</p>}
          {state === "off" && (
            <>
              <p className="leading-6 text-muted">يصلك إشعار عند إضافة تلاوات جديدة للشيخ، حتى والموقع مغلق.</p>
              <button type="button" disabled={busy} onClick={() => run(enablePush)} className="min-h-11 rounded-full bg-accent font-semibold text-accent-ink hover:bg-accent-hover disabled:opacity-50">
                {busy ? "جارٍ التفعيل…" : "فعّل الإشعارات"}
              </button>
            </>
          )}
          {state === "on" && (
            <>
              <p className="leading-6">✓ الإشعارات مفعّلة على هذا الجهاز.</p>
              <button type="button" disabled={busy} onClick={() => run(disablePush)} className="min-h-11 rounded-full border border-line-strong text-muted hover:text-text disabled:opacity-50">
                {busy ? "جارٍ الإيقاف…" : "إيقاف الإشعارات"}
              </button>
            </>
          )}
          {error && <p className="text-[#E5636B]">{error}</p>}
        </div>
      )}
    </div>
  );
}
