"use client";

import { useCallback, useEffect, useState } from "react";
import type { Recording } from "@/types";

/**
 * التلاوات المحفوظة للاستماع بدون إنترنت.
 * الملف نفسه في Cache Storage (الـ service worker بيشغّله من هناك)، وبياناته في localStorage عشان تتعرض.
 */
const AUDIO_CACHE = "yd-audio-v1";
const KEY = "yd-offline-v1";
const EVENT = "yd-offline-change";

export interface SavedItem {
  rec: Recording;
  url: string;
  size: number;
  savedAt: string;
}

/**
 * علامة في رابط التلاوة المحفوظة: الـ service worker بيتدخّل في الطلبات اللي عليها العلامة دي بس،
 * والتلاوات العادية بتتحمّل من السيرفر مباشرة من غير ما تعدّي عليه.
 */
export const OFFLINE_FLAG = "yd-offline=1";

/** رابط التشغيل: لو التلاوة محفوظة بنضيف العلامة، وإلا الرابط زي ما هو */
export function playbackUrl(url: string): string {
  if (typeof window === "undefined" || !read().some((x) => x.url === url)) return url;
  return url + (url.includes("?") ? "&" : "?") + OFFLINE_FLAG;
}

export const canSaveOffline = (r: Recording) =>
  typeof window !== "undefined" && "caches" in window && "serviceWorker" in navigator && !r.youtubeId && !!r.audioUrl;

function read(): SavedItem[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function write(list: SavedItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* تجاهل */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** بيحمّل الملف ويحفظه، وبيبلّغ بنسبة التحميل */
export async function saveOffline(r: Recording, onProgress?: (pct: number) => void): Promise<void> {
  // نطلب من المتصفح ميمسحش الملفات لوحده لما المساحة تقل
  navigator.storage?.persist?.().catch(() => {});
  // من غير cache: النسخة اللي المشغّل حمّلها قبل كده مفيهاش إذن CORS، فالحفظ بيفشل لو استخدمها
  const res = await fetch(r.audioUrl, { mode: "cors", cache: "no-store" });
  if (!res.ok || !res.body) throw new Error(`تعذّر التحميل (${res.status})`);
  const total = Number(res.headers.get("Content-Length")) || 0;
  const type = res.headers.get("Content-Type") || "audio/mpeg";
  // الملف بيعدّي على طول للتخزين على الجهاز وإحنا بنعدّ الحجم، من غير ما يتجمّع كله في الذاكرة
  // (ملف ٤٠ ميجا في الذاكرة كان ممكن يخلّي الموبايل يقفل الصفحة)
  let got = 0;
  const counted = res.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, ctrl) {
        got += chunk.length;
        if (total) onProgress?.(Math.round((got / total) * 100));
        ctrl.enqueue(chunk);
      },
    }),
  );
  const cache = await caches.open(AUDIO_CACHE);
  await cache.put(
    r.audioUrl,
    new Response(counted, { headers: { "Content-Type": type, ...(total && { "Content-Length": String(total) }), "Accept-Ranges": "bytes" } }),
  );
  write([...read().filter((x) => x.rec.id !== r.id), { rec: r, url: r.audioUrl, size: got || total, savedAt: new Date().toISOString() }]);
  // نتأكد إن صفحة المحفوظات نفسها هتفتح من غير نت
  navigator.serviceWorker?.controller?.postMessage("warm-offline");
}

export async function removeOffline(id: string): Promise<void> {
  const item = read().find((x) => x.rec.id === id);
  if (item) await (await caches.open(AUDIO_CACHE)).delete(item.url);
  write(read().filter((x) => x.rec.id !== id));
}

export function useOffline() {
  const [items, setItems] = useState<SavedItem[]>([]);
  useEffect(() => {
    const sync = () => setItems(read());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const isSaved = useCallback((id: string) => items.some((x) => x.rec.id === id), [items]);
  return { items, isSaved, totalSize: items.reduce((s, x) => s + x.size, 0) };
}

export const formatSize = (bytes: number) =>
  bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1)} جيجا` : `${Math.max(1, Math.round(bytes / 1024 ** 2))} ميجا`;
