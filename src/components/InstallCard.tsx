"use client";

import { useEffect, useState } from "react";
import { NotificationsButton } from "./NotificationsButton";

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Mode = "android" | "ios" | "other";

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
function isIOS() {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

/**
 * كارت ثابت في الرئيسية بيعرّف بمميزات التطبيق: الإشعارات، والاستماع من غير نت، والكهف كل جمعة.
 * مبيظهرش لو الموقع متثبّت أصلًا. (الدعوة العائمة InstallPrompt لسه شغالة زي ما هي)
 */
export function InstallCard() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [event, setEvent] = useState<InstallEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) return;
    setMode(isIOS() ? "ios" : "other");
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

  if (!mode) return null;

  const install = async () => {
    if (!event) return;
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === "accepted") setMode(null);
  };

  return (
    <section aria-labelledby="install-title" className="relative rounded-[30px] border border-line bg-surface p-6 sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="text-sm font-semibold text-gold">على موبايلك</p>
          <h2 id="install-title" className="font-display text-3xl font-bold">
            ثبّت الموقع كتطبيق
          </h2>
          <p className="max-w-lg leading-7 text-muted">
            إشعار بكل تلاوة جديدة من الحرم، واستماع من غير نت للسور اللي حفظتها، وسورة الكهف كل جمعة.
          </p>

          {mode === "ios" && (
            <p className="mt-1 text-sm leading-7 text-text">
              من سفاري: اضغط زرار المشاركة، وبعدين «إضافة إلى الشاشة الرئيسية».
            </p>
          )}
          {mode === "other" && (
            <p className="mt-1 text-sm leading-7 text-text">
              افتح الموقع من موبايلك، أو من قايمة المتصفح اختار «تثبيت التطبيق».
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3">
            {mode === "android" && (
              <button
                type="button"
                onClick={install}
                className="flex min-h-11 items-center rounded-full bg-accent px-6 font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
              >
                ثبّت التطبيق
              </button>
            )}
            <NotificationsButton label="فعّل الإشعارات" align="start" sheet className="flex min-h-11 items-center gap-2 rounded-full border border-line-strong px-5 text-sm font-semibold transition-colors hover:border-gold/60" />
          </div>
        </div>

        {/* موبايل صغير فيه إشعار، للتوضيح بس */}
        <div aria-hidden className="mx-auto hidden h-[220px] w-[150px] shrink-0 rounded-[28px] border-[6px] border-[#0B1D17] bg-[#123227] px-2.5 pt-3 text-[#F1EEE6] shadow-float sm:block">
          <div className="mx-auto h-1 w-10 rounded-full bg-white/20" />
          <div className="mt-9 rounded-xl bg-white/10 p-2.5 text-[10.5px] leading-5">
            <b className="block text-[11px] text-[#E7CD94]">تلاوة جديدة</b>
            صلاة العشاء من المسجد الحرام
          </div>
          <div className="mt-2 rounded-xl bg-white/10 p-2.5 text-[10.5px] leading-5 opacity-70">
            <b className="block text-[11px] text-[#E7CD94]">يوم الجمعة</b>
            سورة الكهف بصوت الشيخ
          </div>
        </div>
      </div>
    </section>
  );
}
