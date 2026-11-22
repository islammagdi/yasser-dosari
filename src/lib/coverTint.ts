"use client";

import { useEffect, useState } from "react";

/** لون الغلاف: درجة اللون (0–360) والتشبّع (0–100) */
export interface Tint {
  h: number;
  s: number;
}

/** لون الأغلفة المولّدة (أخضر الموقع)، ولو الصورة مسمحتش نقرا ألوانها */
export const FALLBACK_TINT: Tint = { h: 158, s: 42 };

const cache = new Map<string, Tint>();

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return [h, s, l];
}

/**
 * اللون الغالب في الصورة: بنصغّرها لـ ٢٤×٢٤، ونتجاهل الأبيض والأسود والرمادي،
 * ونقسّم الألوان على ٢٤ درجة ونختار الأكتر (بوزن التشبّع، عشان اللون الحي يكسب الباهت).
 * لو الصورة كلها تقريبًا رمادي، بنرجّع درجتها بتشبّع خفيف بدل ما نخترع لون.
 */
function extract(img: HTMLImageElement): Tint | null {
  const N = 24;
  const c = document.createElement("canvas");
  c.width = c.height = N;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, N, N);
  const data = ctx.getImageData(0, 0, N, N).data; // بيرمي خطأ لو الصورة مش مسموح نقراها (CORS)
  const bins = Array.from({ length: 24 }, () => ({ w: 0, hx: 0, hy: 0, s: 0 }));
  let colorful = 0;
  let all = { hx: 0, hy: 0, n: 0 };
  for (let i = 0; i < data.length; i += 4) {
    const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    const rad = (h * Math.PI) / 180;
    all = { hx: all.hx + Math.cos(rad), hy: all.hy + Math.sin(rad), n: all.n + 1 };
    if (l < 0.1 || l > 0.92 || s < 0.18) continue;
    colorful++;
    const w = s * (1 - Math.abs(l - 0.5));
    const b = bins[Math.floor(h / 15) % 24];
    b.w += w;
    b.hx += Math.cos(rad) * w;
    b.hy += Math.sin(rad) * w;
    b.s += s * w;
  }
  const hueOf = (x: number, y: number) => ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  if (colorful < data.length / 4 / 20) return { h: Math.round(hueOf(all.hx, all.hy)), s: 10 };
  const best = bins.reduce((a, b) => (b.w > a.w ? b : a));
  return { h: Math.round(hueOf(best.hx, best.hy)), s: Math.round(Math.min(1, best.s / best.w) * 100) };
}

/** لون غلاف التلاوة (لخلفية المشغّل الكبير). من غير غلاف أو لو القراءة فشلت: لون الموقع */
export function useCoverTint(src?: string): Tint {
  const [tint, setTint] = useState<Tint>(() => (src && cache.get(src)) || FALLBACK_TINT);
  useEffect(() => {
    if (!src) {
      setTint(FALLBACK_TINT);
      return;
    }
    const hit = cache.get(src);
    if (hit) {
      setTint(hit);
      return;
    }
    let alive = true;
    const img = new Image();
    // لازم قبل src: من غيرها المتصفح بيمنعنا نقرا ألوان صورة من دومين تاني
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => {
      let t: Tint | null = null;
      try {
        t = extract(img);
      } catch {
        /* الدومين مسمحش نقرا الألوان (CORS): لون الموقع */
      }
      const v = t ?? FALLBACK_TINT;
      cache.set(src, v);
      if (alive) setTint(v);
    };
    img.onerror = () => {
      cache.set(src, FALLBACK_TINT);
      if (alive) setTint(FALLBACK_TINT);
    };
    // من دومين تاني بنضيف علامة للرابط: لو المتصفح حافظ نسخة الغلاف من غير إذن CORS
    // (الغلاف نفسه بيتعرض من غيره)، كان هيستخدمها والقراءة تفشل
    const cross = /^https?:/.test(src) && !src.startsWith(window.location.origin);
    img.src = cross ? `${src}${src.includes("?") ? "&" : "?"}tint=1` : src;
    return () => {
      alive = false;
    };
  }, [src]);
  return tint;
}
