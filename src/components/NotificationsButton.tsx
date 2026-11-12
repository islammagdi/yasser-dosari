"use client";

import { useEffect, useRef, useState } from "react";
import { disablePush, enablePush, hasChosenTopics, pushState, pushTopics, setPushTopics, type PushState, type PushTopics } from "@/lib/push/client";

/** زرار الجرس: تفعيل الإشعارات واختيار أنواعها (تلاوات جديدة، بداية صلاة الشيخ) */
/** label: نص جنب الأيقونة (للكارت في الرئيسية)؛ من غيره زرار أيقونة بس زي الهيدر */
/** align: ناحية فتح القايمة؛ "end" للهيدر (الزرار على الشمال)، "start" للزرار اللي على اليمين */
export function NotificationsButton({ className = "", label, align = "end" }: { className?: string; label?: string; align?: "start" | "end" }) {
  const [state, setState] = useState<PushState | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [topics, setTopics] = useState<PushTopics>({ recitations: true, imamate: true });
  /** مشترك من قبل إشعار الإمامة: الإشعار ده مقفول عنده على السيرفر، فبنوريه علامة "جديد" لحد ما يفتح القايمة */
  const [isNew, setIsNew] = useState(false);
  useEffect(() => {
    if (state !== "on") {
      setTopics(pushTopics());
      return;
    }
    if (hasChosenTopics()) setTopics(pushTopics());
    else {
      setTopics({ recitations: true, imamate: false });
      setIsNew(true);
    }
  }, [state]);
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
        onClick={() => {
          setOpen(!open);
          if (isNew) {
            setIsNew(false);
            // بنحفظ الوضع الحالي زي ما هو (الإمامة مقفولة)، والزائر يعلّم عليها لو عايزها
            try {
              localStorage.setItem("yd-push-topics", JSON.stringify(topics));
            } catch {
              /* تجاهل */
            }
          }
        }}
        aria-expanded={open}
        aria-label={label ? undefined : `${state === "on" ? "الإشعارات مفعّلة" : "الإشعارات"}${isNew ? "، فيه نوع جديد" : ""}`}
        className={`relative ${className}`}
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill={state === "on" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {isNew && <span aria-hidden className="absolute end-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-[#E5636B] ring-2 ring-ink" />}
        {label && <span>{state === "on" ? "الإشعارات مفعّلة" : label}</span>}
      </button>

      {open && (
        <div className={`glass absolute ${align === "start" ? "start-0" : "end-0"} top-full z-50 mt-2 flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-2xl border border-fg/10 p-4 text-sm shadow-float`}>
          <p className="font-semibold text-gold-soft">الإشعارات</p>
          {state === "on" && !topics.imamate && (
            <p className="rounded-xl bg-gold/10 px-3 py-2 leading-6 text-text">جديد: إشعار أول ما صلاة الشيخ تبدأ في الحرم، ومعاه رابط البث المباشر.</p>
          )}
          {(state === "off" || state === "on") && (
            <fieldset className="flex flex-col gap-2">
              <legend className="sr-only">أنواع الإشعارات</legend>
              {(
                [
                  ["recitations", "تلاوة جديدة اتضافت"],
                  ["imamate", "بداية صلاة الشيخ في الحرم، مع رابط البث المباشر"],
                ] as const
              ).map(([key, text]) => (
                <label key={key} className="flex cursor-pointer items-start gap-2.5 leading-6">
                  <input
                    type="checkbox"
                    checked={topics[key]}
                    onChange={async (e) => {
                      const next = { ...topics, [key]: e.target.checked };
                      setTopics(next);
                      try {
                        await setPushTopics(next);
                      } catch {
                        setError("تعذّر حفظ الاختيار الآن.");
                      }
                    }}
                    className="mt-1 h-4 w-4 shrink-0 accent-[rgb(var(--c-accent))]"
                  />
                  {text}
                </label>
              ))}
            </fieldset>
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
