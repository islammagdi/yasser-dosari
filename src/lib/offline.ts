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
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.length;
    if (total) onProgress?.(Math.round((got / total) * 100));
  }
  const blob = new Blob(chunks, { type: res.headers.get("Content-Type") || "audio/mpeg" });
  const cache = await caches.open(AUDIO_CACHE);
  await cache.put(
    r.audioUrl,
    new Response(blob, { headers: { "Content-Type": blob.type, "Content-Length": String(blob.size), "Accept-Ranges": "bytes" } }),
  );
  write([...read().filter((x) => x.rec.id !== r.id), { rec: r, url: r.audioUrl, size: blob.size, savedAt: new Date().toISOString() }]);
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
