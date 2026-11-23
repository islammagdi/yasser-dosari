/**
 * نقل بيانات الزائر لجهاز تاني، من غير حسابات ومن غير سيرفر:
 * كل اللي الموقع حافظه على الجهاز (المفاتيح اللي بتبدأ بـ yd-) بيتجمع في كود أو ملف، ويتفتح على الجهاز الجديد.
 * أي ميزة جديدة بتحفظ بمفتاح yd- بتتنقل لوحدها.
 */

/** حاجات خاصة بالجهاز نفسه، ملهاش معنى على جهاز تاني */
const DEVICE_ONLY = new Set(["yd-visits", "yd-last-visit-v1", "yd-install-dismissed", "yd-player-v1"]);

export interface Backup {
  v: 1;
  at: string;
  data: Record<string, string>;
}

export function collect(): Backup {
  const data: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith("yd-") && !DEVICE_ONLY.has(k)) data[k] = localStorage.getItem(k) ?? "";
  }
  return { v: 1, at: new Date().toISOString(), data };
}

/** بيكتب البيانات على الجهاز ده (بيستبدل الموجود بنفس المفاتيح) */
export function restore(b: Backup) {
  for (const [k, v] of Object.entries(b.data)) {
    if (k.startsWith("yd-") && !DEVICE_ONLY.has(k) && typeof v === "string") localStorage.setItem(k, v);
  }
}

export function parseBackup(json: string): Backup | null {
  try {
    const b = JSON.parse(json);
    return b && b.v === 1 && b.data && typeof b.data === "object" ? (b as Backup) : null;
  } catch {
    return null;
  }
}

// ---------- كود نصي: مضغوط عشان يتبعت في رسالة واتساب ----------

const toB64 = (bytes: Uint8Array) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromB64 = (s: string) => {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

async function pipe(bytes: Uint8Array, stream: GenerateTransformStream): Promise<Uint8Array> {
  const out = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}
type GenerateTransformStream = CompressionStream | DecompressionStream;

/** "YD1:…" مضغوط، أو "YD0:…" لو المتصفح مبيدعمش الضغط */
export async function toCode(b: Backup): Promise<string> {
  const raw = new TextEncoder().encode(JSON.stringify(b));
  if (typeof CompressionStream === "undefined") return `YD0:${toB64(raw)}`;
  return `YD1:${toB64(await pipe(raw, new CompressionStream("gzip")))}`;
}

export async function fromCode(code: string): Promise<Backup | null> {
  const c = code.trim().replace(/\s+/g, "");
  try {
    if (c.startsWith("YD0:")) return parseBackup(new TextDecoder().decode(fromB64(c.slice(4))));
    if (c.startsWith("YD1:")) return parseBackup(new TextDecoder().decode(await pipe(fromB64(c.slice(4)), new DecompressionStream("gzip"))));
  } catch {
    /* كود ناقص أو متغيّر */
  }
  return null;
}

/** ملخص بالعربي للي جوه النسخة، عشان الزائر يعرف هيتنقل إيه */
type Tr = (ar: string, params?: Record<string, string | number>) => string;
const plain: Tr = (ar, params) => Object.entries(params ?? {}).reduce((s, [k, v]) => s.split(`{${k}}`).join(String(v)), ar);

/** tr: دالة الترجمة t من useL، عشان الملخص يطلع بلغة الصفحة */
export function summarize(b: Backup, tr: Tr = plain): string[] {
  const j = (k: string) => {
    try {
      return JSON.parse(b.data[k] ?? "null");
    } catch {
      return null;
    }
  };
  const out: string[] = [];
  const fav = j("yd-favorites-v1");
  if (Array.isArray(fav) && fav.length) out.push(tr("{n} تلاوة في المفضلة", { n: fav.length }));
  const lists = j("yd-playlists-v1");
  if (Array.isArray(lists) && lists.length) out.push(tr("{n} قائمة تشغيل", { n: lists.length }));
  const k = j("yd-khatma-v1");
  if (k?.done?.length) out.push(tr("{n} سورة في الختمة", { n: k.done.length }));
  if (k?.completed) out.push(tr("{n} ختمة مكتملة", { n: k.completed }));
  if (j("yd-wird-v1")?.days) out.push(tr("خطة الورد اليومي"));
  const days = j("yd-wird-days-v1");
  if (Array.isArray(days) && days.length) out.push(tr("{n} يوم ورد مكتمل", { n: days.length }));
  const progress = j("yd-progress-v1");
  if (progress && Object.keys(progress).length) out.push(tr("مكانك في {n} تلاوة", { n: Object.keys(progress).length }));
  if (j("yd-reading-v1")?.bookmark) out.push(tr("علامة القراءة"));
  return out;
}
