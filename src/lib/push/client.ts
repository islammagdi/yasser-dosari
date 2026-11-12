"use client";

/** الاشتراك في الإشعارات من المتصفح */

export type PushState = "unsupported" | "needs-install" | "denied" | "off" | "on";

const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);
const standalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

function keyBytes(base64: string): Uint8Array {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export async function pushState(): Promise<PushState> {
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  // الآيفون بيدعم الإشعارات بس للموقع المتثبّت على الشاشة الرئيسية
  if (!supported) return isIOS() && !standalone() ? "needs-install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub ? "on" : "off";
}

export interface PushTopics {
  /** تلاوة جديدة اتضافت */
  recitations: boolean;
  /** صلاة بإمامة الشيخ بدأت في الحرم، مع رابط البث */
  imamate: boolean;
}
const TOPICS_KEY = "yd-push-topics";

/** الأنواع اللي الزائر اختارها (الافتراضي: الاتنين) */
export function pushTopics(): PushTopics {
  try {
    const v = JSON.parse(localStorage.getItem(TOPICS_KEY) ?? "null");
    if (v && typeof v.recitations === "boolean" && typeof v.imamate === "boolean") return v;
  } catch {
    /* تجاهل */
  }
  return { recitations: true, imamate: true };
}

/** تغيير الأنواع: بيتحفظ، ولو الجهاز مشترك بيتبعت للسيرفر */
export async function setPushTopics(topics: PushTopics): Promise<void> {
  try {
    localStorage.setItem(TOPICS_KEY, JSON.stringify(topics));
  } catch {
    /* تجاهل */
  }
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON(), topics }),
  });
  if (!res.ok) throw new Error("subscribe failed");
}

export async function enablePush(): Promise<PushState> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";
  const reg = await navigator.serviceWorker.ready;
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) throw new Error("missing VAPID key");
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) }));
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON(), topics: pushTopics() }),
  });
  if (!res.ok) throw new Error("subscribe failed");
  return "on";
}

export async function disablePush(): Promise<PushState> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await fetch("/api/push/unsubscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
    await sub.unsubscribe();
  }
  return "off";
}

// ---------- تذكير الورد اليومي ----------

const WIRD_KEY = "yd-wird-push";

/** الساعة اللي التذكير متظبط عليها على الجهاز ده، أو null */
export function wirdReminderTime(): string | null {
  try {
    return localStorage.getItem(WIRD_KEY);
  } catch {
    return null;
  }
}

/** بيفعّل الإشعارات لو مش مفعّلة، وبيظبط التذكير على الساعة دي */
export async function enableWirdReminder(time: string): Promise<PushState> {
  const state = await enablePush();
  if (state !== "on") return state;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return "off";
  const res = await fetch("/api/push/wird", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON(), time, tz: Intl.DateTimeFormat().resolvedOptions().timeZone }),
  });
  if (!res.ok) throw new Error("wird reminder failed");
  localStorage.setItem(WIRD_KEY, time);
  return "on";
}

export async function disableWirdReminder(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await fetch("/api/push/wird", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
  }
  localStorage.removeItem(WIRD_KEY);
}
