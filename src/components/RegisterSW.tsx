"use client";

import { useEffect } from "react";

export function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => navigator.serviceWorker.ready)
        .then((reg) => {
          // تجهيز الوضع بدون إنترنت: مرة واحدة كل جلسة عشان يتحدّث مع أي تحديث للموقع
          try {
            if (sessionStorage.getItem("yd-sw-warm")) return;
            sessionStorage.setItem("yd-sw-warm", "1");
          } catch {
            /* تجاهل */
          }
          reg.active?.postMessage("warm-offline");
        })
        .catch(() => {});
    }
  }, []);
  return null;
}