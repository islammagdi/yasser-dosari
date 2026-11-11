/**
 * صورة آية (أو أكتر، أو جزء من آية) للمشاركة: بترسم على canvas بخط المصحف وألوان الموقع، وبترجع PNG.
 * مربع (١٠٨٠×١٠٨٠) للبوستات، أو طولي (١٠٨٠×١٩٢٠) للستوري.
 */
import type { Ayah } from "./api/quranText";
import { toArabicDigits } from "./format";
import { surahName } from "./quran";

export type ImageFormat = "square" | "story";

const C = {
  ink: "#0D1512",
  emerald: "#1E4A3C",
  text: "#F1EEE6",
  muted: "#A3B1A9",
  gold: "#CDAA62",
  goldSoft: "#E7CD94",
};
// الخطوط متحمّلة بـ next/font بأسامي متولّدة، فبناخد الاسم الحقيقي من متغيرات الصفحة
const cssFont = (name: string, fallback: string) => {
  const v = typeof document === "undefined" ? "" : getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `${v}, ${fallback}` : fallback;
};
let QURAN_FONT = 'serif';
let UI_FONT = "system-ui, sans-serif";

// من غير لوجو: مساحة النص بتبدأ من فوق الإطار على طول
const LAYOUT = {
  square: { w: 1080, h: 1080, top: 120, bottom: 860, refY: 930, siteY: 990, max: 64, pad: 120 },
  story: { w: 1080, h: 1920, top: 260, bottom: 1480, refY: 1580, siteY: 1650, max: 76, pad: 110 },
} as const;

// ---------- اختيار النص: آية، أو كذا آية، أو جزء ----------

/** كلمة في التحديد. علامات الوقف (ۚ ۖ …) بتتلزق في الكلمة اللي قبلها، فمبتتختارش لوحدها */
export interface Word {
  ayah: number;
  text: string;
  /** آخر كلمة في الآية: بعدها بيتحط رقم الآية */
  last: boolean;
}

const HAS_LETTER = /[\u0621-\u064A\u0671-\u06D3]/;

export function wordsOf(ayahs: Ayah[]): Word[] {
  const out: Word[] = [];
  for (const a of ayahs) {
    const tokens: string[] = [];
    for (const t of a.text.split(/\s+/).filter(Boolean)) {
      if (!HAS_LETTER.test(t) && tokens.length) tokens[tokens.length - 1] += ` ${t}`;
      else tokens.push(t);
    }
    tokens.forEach((text, i) => out.push({ ayah: a.n, text, last: i === tokens.length - 1 }));
  }
  return out;
}

/** النص والمرجع لكلمات من start لـ end (شاملين) */
export function selectionText(words: Word[], start: number, end: number, surah: number) {
  const picked = words.slice(start, end + 1);
  const body = picked.map((w) => (w.last ? `${w.text} ﴿${toArabicDigits(w.ayah)}﴾` : w.text)).join(" ");
  const first = picked[0].ayah;
  const lastAyah = picked[picked.length - 1].ayah;
  // جزء = البداية مش أول كلمة في آيتها، أو النهاية مش آخر كلمة في آيتها
  const partial = (start > 0 && words[start - 1].ayah === first) || !picked[picked.length - 1].last;
  const range = first === lastAyah ? `الآية ${toArabicDigits(first)}` : `الآيات ${toArabicDigits(first)}–${toArabicDigits(lastAyah)}`;
  const ref = `سورة ${surahName(surah)} · ${partial ? "من " : ""}${range}`;
  return { body, ref, first, last: lastAyah };
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > width && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** truncated = النص أطول من مساحة الصورة واتقص */
export async function renderAyahImage(opts: {
  body: string;
  ref: string;
  format: ImageFormat;
  site: string;
}): Promise<{ blob: Blob; truncated: boolean }> {
  QURAN_FONT = cssFont("--font-amiri-quran", "serif");
  UI_FONT = cssFont("--font-plex", "system-ui, sans-serif");
  const L = LAYOUT[opts.format];
  const body = opts.body;

  await Promise.all([
    document.fonts.load(`48px ${QURAN_FONT}`, body),
    document.fonts.load(`32px ${UI_FONT}`, "سورة"),
  ]).catch(() => undefined);

  const canvas = document.createElement("canvas");
  canvas.width = L.w;
  canvas.height = L.h;
  const ctx = canvas.getContext("2d")!;
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // الخلفية: حبري، وتوهّج زمردي في النص
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, L.w, L.h);
  const glow = ctx.createRadialGradient(L.w / 2, L.h / 2, 0, L.w / 2, L.h / 2, L.h * 0.7);
  glow.addColorStop(0, `${C.emerald}cc`);
  glow.addColorStop(1, `${C.ink}00`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, L.w, L.h);

  // إطار دهبي مزدوج
  ctx.strokeStyle = `${C.gold}99`;
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, L.w - 80, L.h - 80);
  ctx.strokeStyle = `${C.gold}44`;
  ctx.strokeRect(54, 54, L.w - 108, L.h - 108);

  // نص الآية: أكبر خط يدخل في المساحة، ولو الآية طويلة جدًا بتتقص بـ "…"
  const width = L.w - L.pad * 2;
  const areaH = L.bottom - L.top;
  let size: number = L.max;
  let lines: string[] = [];
  for (; size >= 28; size -= 2) {
    ctx.font = `${size}px ${QURAN_FONT}`;
    lines = wrap(ctx, body, width);
    if (lines.length * size * 1.9 <= areaH) break;
  }
  size = Math.max(size, 28);
  const lh = size * 1.9;
  const maxLines = Math.floor(areaH / lh);
  const truncated = lines.length > maxLines;
  if (truncated) {
    lines = lines.slice(0, maxLines);
    lines[maxLines - 1] += " …";
  }
  ctx.font = `${size}px ${QURAN_FONT}`;
  ctx.fillStyle = C.text;
  const startY = L.top + (areaH - lines.length * lh) / 2 + lh / 2;
  lines.forEach((l, i) => ctx.fillText(l, L.w / 2, startY + i * lh));

  // فاصل صغير والمرجع
  ctx.strokeStyle = `${C.gold}88`;
  ctx.beginPath();
  ctx.moveTo(L.w / 2 - 60, L.refY - 46);
  ctx.lineTo(L.w / 2 + 60, L.refY - 46);
  ctx.stroke();
  ctx.font = `600 34px ${UI_FONT}`;
  ctx.fillStyle = C.goldSoft;
  ctx.fillText(opts.ref, L.w / 2, L.refY);
  ctx.font = `24px ${UI_FONT}`;
  ctx.fillStyle = C.muted;
  ctx.direction = "ltr";
  ctx.fillText(opts.site, L.w / 2, L.siteY);

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"),
  );
  return { blob, truncated };
}