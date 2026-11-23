/**
 * إرسال حدث للإحصائيات من المتصفح. مفيش أي بيانات شخصية:
 * السيرفر بيحسب الزائر من بصمة يومية متشفّرة (بتتغير كل يوم)، ومش بيخزن IP ولا كوكيز.
 */
export type StatEvent =
  | { type: "pageview" }
  | { type: "play"; id: string; title?: string }
  | { type: "clip_view"; id: string; title?: string }
  | { type: "clip_share"; id: string }
  | { type: "clip_download"; id: string }
  | { type: "share"; id?: string }
  | { type: "save_offline"; id: string }
  | { type: "install" }
  | { type: "push_subscribe" }
  | { type: "search" };

/** مصدر الزيارة بيتبعت مع أول صفحة بس (الـ referrer بيفضل هو هو وإنت بتتنقل جوه الموقع) */
let refSent = false;

export function track(e: StatEvent): void {
  if (typeof window === "undefined") return;
  if (location.pathname.startsWith("/admin")) return;
  try {
    let ref: string | undefined;
    if (e.type === "pageview" && !refSent) {
      refSent = true;
      ref = document.referrer || "direct";
    }
    const body = JSON.stringify({
      ...e,
      path: location.pathname,
      pageTitle: document.title,
      ref,
      w: window.innerWidth,
      lang: document.documentElement.lang,
    });
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/t", blob)) {
      void fetch("/api/t", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
    }
  } catch {
    /* الإحصائيات عمرها ما توقّف الموقع */
  }
}
