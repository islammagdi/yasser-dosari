"use client";

import { useEffect, useRef, useState } from "react";
import { disablePush, enablePush, pushState, type PushState } from "@/lib/push/client";

/** زرار الإشعارات: تفعيل وإيقاف (الإشعارات عامة: كل جديد في الموقع) */
/** label: نص جنب الأيقونة (للكارت في الرئيسية)؛ من غيره زرار أيقونة بس زي الهيدر */
/** align: ناحية فتح القايمة؛ "end" للهيدر (الزرار على الشمال)، "start" للزرار اللي على اليمين */
/**
 * sheet: على الموبايل القايمة بتظهر كلوحة ثابتة تحت الشاشة (للزرار اللي في نص الصفحة).
 * في الهيدر مينفعش، لأن الهيدر عليه backdrop-filter فـ fixed بيتحسب منه مش من الشاشة.
 */
export function NotificationsButton({
  className = "",
  label,
  align = "end",
  sheet = false,
  up = false,
}: {
  className?: string;
  label?: string;
  align?: "start" | "end";
  sheet?: boolean;
  /** القايمة تفتح لفوق (للزرار اللي في آخر الصفحة زي الفوتر) */
  up?: boolean;
}) {
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
        aria-label={label ? undefined : state === "on" ? "الإشعارات مفعّلة" : "الإشعارات"}
        className={`relative ${className}`}
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill={state === "on" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {label && <span>{state === "on" ? "الإشعارات مفعّلة" : label}</span>}
      </button>

      {open && (
        <div
          className={`glass z-[60] flex flex-col gap-3 rounded-2xl border border-fg/10 p-4 text-sm shadow-float ${
            sheet
              ? `!bg-raised fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:absolute sm:inset-x-auto sm:w-72 ${up ? "sm:bottom-full sm:mb-2" : "sm:bottom-auto sm:top-full sm:mt-2"} ${align === "start" ? "sm:start-0" : "sm:end-0"}`
              : `absolute ${up ? "bottom-full mb-2" : "top-full mt-2"} w-72 max-w-[calc(100vw-2rem)] ${align === "start" ? "start-0" : "end-0"}`
          }`}
        >
          <p className="font-semibold text-gold-soft">الإشعارات</p>
          {(state === "off" || state === "on") && (
            <p className="leading-6 text-text">
              بيوصلك إشعار بكل جديد في الموقع: التلاوات الجديدة، وبداية صلاة الشيخ في الحرم مع رابط البث، وأي تحديث.
            </p>
          )}
          {state === "unsupported" && <p className="leading-6 text-muted">متصفحك لا يدعم الإشعارات.</p>}
          {state === "needs-install" && (
            <p className="leading-6 text-muted">
              على الآيفون، تعمل الإشعارات بعد تثبيت الموقع: اضغط زر المشاركة، ثم «إضافة إلى الشاشة الرئيسية»، وافتح الموقع من الأيقونة الجديدة.
            </p>
          )}
          {state === "denied" && <p className="leading-6 text-muted">الإشعارات محظورة لهذا الموقع من إعدادات المتصفح. فعّلها من الإعدادات ثم عُد إلى هنا.</p>}
          {state === "off" && (
            <>
              <p className="leading-6 text-muted">بيوصلك الإشعار حتى والموقع مقفول.</p>
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
