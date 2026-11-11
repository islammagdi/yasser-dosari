"use client";

import { useEffect } from "react";

const IDLE_MS = 60 * 60 * 1000; // ساعة من غير نشاط = خروج
const PING_MS = 10 * 60 * 1000; // طول ما إنت شغال، بنمدّ الجلسة كل ١٠ دقايق

/** تسجيل الخروج التلقائي من اللوحة بعد ساعة من غير أي حركة */
export function AdminIdle() {
  useEffect(() => {
    let last = Date.now();
    let lastPing = Date.now();
    const active = () => {
      last = Date.now();
      // بتشتغل في اللوحة (حتى لو بتكتب في فورم طويل من غير ما تحفظ): نمدّ الجلسة
      if (last - lastPing > PING_MS) {
        lastPing = last;
        fetch("/admin/ping", { cache: "no-store" }).catch(() => {});
      }
    };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, active, { passive: true }));
    const timer = setInterval(() => {
      if (Date.now() - last >= IDLE_MS) window.location.href = "/admin/login?expired=1";
    }, 30_000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, active));
      clearInterval(timer);
    };
  }, []);
  return null;
}
