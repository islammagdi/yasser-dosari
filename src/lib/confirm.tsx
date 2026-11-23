"use client";

import { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";

/**
 * بديل window.confirm: نافذة تأكيد بشكل الموقع، ومش بتوقف الصفحة.
 * window.confirm بيوقف المتصفح كله لحد ما الزائر يرد، وجوجل بيحسب الوقت ده كـ INP (الصفحة مهنّجة).
 *
 * الاستخدام:
 *   if (!(await ask("حذف القائمة؟", { confirm: "حذف", danger: true }))) return;
 */
export interface AskOptions {
  /** نص زرار الموافقة (الافتراضي «تمام») */
  confirm?: string;
  /** نص زرار الرفض (الافتراضي «لا») */
  cancel?: string;
  /** زرار الموافقة أحمر، للمسح والحاجات اللي مش بترجع */
  danger?: boolean;
}

export function ask(message: string, opts: AskOptions = {}): Promise<boolean> {
  if (typeof document === "undefined") return Promise.resolve(false);
  return new Promise((resolve) => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const back = document.activeElement as HTMLElement | null;
    const done = (v: boolean) => {
      root.unmount();
      host.remove();
      back?.focus?.();
      resolve(v);
    };
    root.render(<Dialog message={message} opts={opts} onDone={done} />);
  });
}

function Dialog({ message, opts, onDone }: { message: string; opts: AskOptions; onDone: (v: boolean) => void }) {
  const cancelBtn = useRef<HTMLButtonElement>(null);
  const okBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // التركيز على «لا» في المسح، وعلى الموافقة في الباقي
    (opts.danger ? cancelBtn : okBtn).current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDone(false);
      // التنقّل بالـ Tab بيفضل بين الزرارين
      if (e.key === "Tab") {
        const els = [okBtn.current, cancelBtn.current].filter(Boolean) as HTMLElement[];
        const i = els.indexOf(document.activeElement as HTMLElement);
        e.preventDefault();
        els[(i + (e.shiftKey ? -1 : 1) + els.length) % els.length]?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onDone, opts.danger]);

  return (
    <div dir={document.documentElement.dir || "rtl"} className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
      <div aria-hidden className="absolute inset-0 bg-[#000]/50" onClick={() => onDone(false)} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={message}
        className="relative flex w-full flex-col gap-5 rounded-t-3xl border border-line bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-text shadow-float sm:max-w-sm sm:rounded-3xl"
      >
        <p className="text-lg leading-8">{message}</p>
        <div className="flex flex-wrap gap-3">
          <button
            ref={okBtn}
            type="button"
            onClick={() => onDone(true)}
            className={`min-h-12 flex-1 rounded-full px-5 font-semibold ${
              opts.danger ? "bg-[#E5636B] text-[#fff] hover:bg-[#d4545c]" : "bg-accent text-accent-ink hover:bg-accent-hover"
            }`}
          >
            {opts.confirm ?? (document.documentElement.lang === "en" ? "OK" : "تمام")}
          </button>
          <button ref={cancelBtn} type="button" onClick={() => onDone(false)} className="min-h-12 flex-1 rounded-full border border-line-strong px-5 hover:border-gold/60">
            {opts.cancel ?? (document.documentElement.lang === "en" ? "Cancel" : "لا")}
          </button>
        </div>
      </div>
    </div>
  );
}
