"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * دعوة لتثبيت الموقع على الموبايل:
 * - أندرويد (كروم وغيره): زرار "تثبيت" بيفتح نافذة التثبيت بتاعة المتصفح.
 * - آيفون وآيباد: شرح الخطوتين (المشاركة ← إضافة إلى الشاشة الرئيسية)، لأن أبل مبتسمحش بزرار مباشر.
 * بتظهر من تاني زيارة، ومبتظهرش لو الموقع متثبّت أو على كمبيوتر، ولو اتقفلت بتغيب شهر.
 */
const VISITS_KEY = "yd-visits";
const SESSION_KEY = "yd-visit-counted";
const DISMISS_KEY = "yd-install-dismissed";
const HIDE_DAYS = 30;

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIOS() {
  const ua = navigator.userAgent;
  // آيباد الحديث بيقول عن نفسه "Mac"، فبنفرّقه باللمس
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* التخزين مش متاح */
  }
}

export function InstallPrompt() {
  const pathname = usePathname();
  const [mode, setMode] = useState<"android" | "ios" | null>(null);
  const [event, setEvent] = useState<InstallEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) return;

    // عدّ الزيارات: مرة واحدة لكل جلسة (تاب)
    let visits = Number(read(VISITS_KEY) ?? 0);
    try {
      if (!sessionStorage.getItem(SESSION_KEY)) {
        sessionStorage.setItem(SESSION_KEY, "1");
        visits += 1;
        write(VISITS_KEY, String(visits));
      }
    } catch {
      /* تجاهل */
    }

    const dismissed = Number(read(DISMISS_KEY) ?? 0);
    const recentlyDismissed = Date.now() - dismissed < HIDE_DAYS * 86_400_000;
    if (visits < 2 || recentlyDismissed) return;

    if (isIOS()) {
      setMode("ios");
      return;
    }
    // كروم وإيدج على الكمبيوتر بيبعتوا نفس الحدث، بس الدعوة للموبايل بس (شاشات اللمس)
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    // أندرويد: المتصفح بيبعت الحدث ده لما الموقع يبقى قابل للتثبيت
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
      setMode("android");
    };
    const onInstalled = () => setMode(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!mode || pathname.startsWith("/admin")) return null;

  const dismiss = () => {
    write(DISMISS_KEY, String(Date.now()));
    setMode(null);
  };

  const install = async () => {
    if (!event) return;
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === "accepted") setMode(null);
    else dismiss();
  };

  return (
    <aside
      aria-label="تثبيت الموقع"
      className="glass fixed inset-x-3 z-50 mx-auto max-w-md rounded-3xl border border-white/10 p-4 shadow-float"
      style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" className="h-12 w-12 shrink-0 rounded-xl" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="font-semibold">ثبّت الموقع على جوالك</p>
          {mode === "android" ? (
            <p className="text-sm leading-6 text-muted">يفتح كتطبيق من الشاشة الرئيسية، بضغطة واحدة.</p>
          ) : (
            <ol className="flex flex-col gap-1.5 text-sm leading-6 text-muted">
              <li className="flex flex-wrap items-center gap-1.5">
                ١. اضغط زر المشاركة
                <ShareIcon />
                في أسفل المتصفح
              </li>
              <li className="flex flex-wrap items-center gap-1.5">
                ٢. اختر «إضافة إلى الشاشة الرئيسية»
                <AddIcon />
              </li>
            </ol>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="إغلاق"
          className="-me-1 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-white/10 hover:text-text"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      {mode === "android" && (
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={install} className="min-h-11 flex-1 rounded-full bg-gold font-semibold text-gold-ink hover:bg-gold-soft">
            تثبيت
          </button>
          <button type="button" onClick={dismiss} className="min-h-11 rounded-full px-4 text-sm text-muted hover:text-text">
            ليس الآن
          </button>
        </div>
      )}
    </aside>
  );
}

/** أيقونة المشاركة في سفاري: مربع وسهم لفوق */
function ShareIcon() {
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-gold-soft" aria-label="زر المشاركة">
      <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v12M8 7l4-4 4 4" />
        <path d="M6 11v9h12v-9" />
      </svg>
    </span>
  );
}

/** أيقونة "إضافة إلى الشاشة الرئيسية": مربع فيه + */
function AddIcon() {
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-gold-soft" aria-hidden>
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    </span>
  );
}