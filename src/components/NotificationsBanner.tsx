"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { enablePush, pushState, type PushState } from "@/lib/push/client";

const DISMISS_KEY = "yd-push-banner-dismissed";
/** لو الزائر قفل البانر، بيرجع يظهر بعد أسبوعين */
const DISMISS_DAYS = 14;

/**
 * بانر صغير تحت الهيدر للي مش مفعّل الإشعارات: "فعّل الإشعارات عشان يوصلك كل جديد".
 * بدل الجرس اللي كان في الهيدر (كان بيوحي إن فيه صندوق إشعارات).
 * مبيظهرش لو الإشعارات شغالة، أو مقفولة من المتصفح، أو مش مدعومة.
 */
export function NotificationsBanner() {
  const pathname = usePathname();
  const [state, setState] = useState<PushState | null>(null);
  const [hidden, setHidden] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    try {
      const at = Number(localStorage.getItem(DISMISS_KEY));
      setHidden(!!at && Date.now() - at < DISMISS_DAYS * 86_400_000);
    } catch {
      setHidden(false);
    }
    pushState().then(setState).catch(() => setState("unsupported"));
  }, []);

  if (pathname.startsWith("/admin") || hidden || (state !== "off" && state !== "needs-install") || msg === "done") return null;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* تجاهل */
    }
  };

  const enable = async () => {
    setBusy(true);
    setMsg("");
    try {
      const s = await enablePush();
      setState(s);
      if (s === "on") setMsg("done");
      else if (s === "denied") setMsg("الإشعارات مقفولة من إعدادات المتصفح. فعّلها من الإعدادات وارجع هنا.");
    } catch {
      setMsg("تعذّر التفعيل دلوقتي. حاول تاني.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div role="region" aria-label="تفعيل الإشعارات" className="relative mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-gold/30 bg-gold/10 py-3 pe-12 ps-4 text-sm sm:mb-8">
      <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-gold" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      <p className="min-w-[13rem] flex-1 leading-6">
        {state === "needs-install"
          ? "على الآيفون: ثبّت الموقع على الشاشة الرئيسية الأول (زرار المشاركة ثم «إضافة إلى الشاشة الرئيسية»)، عشان يوصلك كل جديد بإشعار."
          : msg || "فعّل الإشعارات عشان يوصلك كل جديد: التلاوات، وبداية صلاة الشيخ في الحرم."}
      </p>
      {state === "off" && (
        <button
          type="button"
          onClick={enable}
          disabled={busy}
          className="min-h-10 rounded-full bg-accent px-5 font-semibold max-sm:ms-8 text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {busy ? "لحظة…" : "فعّل الإشعارات"}
        </button>
      )}
      <button type="button" onClick={dismiss} aria-label="إخفاء" className="absolute end-1.5 top-1.5 flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-fg/5 hover:text-text">
        <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  );
}
