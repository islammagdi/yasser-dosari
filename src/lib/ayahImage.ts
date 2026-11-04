/**
 * صورة آية للمشاركة: بترسم على canvas بخط المصحف وألوان الموقع، وبترجع PNG.
 * مربع (١٠٨٠×١٠٨٠) للبوستات، أو طولي (١٠٨٠×١٩٢٠) للستوري.
 */
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
const QURAN_FONT = '"Amiri Quran", "Amiri", serif';
const UI_FONT = '"IBM Plex Sans Arabic", system-ui, sans-serif';

const LAYOUT = {
  square: { w: 1080, h: 1080, logoY: 96, top: 230, bottom: 860, refY: 930, siteY: 990, max: 64, pad: 120 },
  story: { w: 1080, h: 1920, logoY: 250, top: 460, bottom: 1480, refY: 1580, siteY: 1650, max: 76, pad: 110 },
} as const;

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
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

export async function renderAyahImage(opts: {
  surah: number;
  ayah: number;
  text: string;
  format: ImageFormat;
  site: string;
}): Promise<Blob> {
  const L = LAYOUT[opts.format];
  const body = `${opts.text} ﴿${toArabicDigits(opts.ayah)}﴾`;

  await Promise.all([
    document.fonts.load(`48px ${QURAN_FONT}`, body),
    document.fonts.load(`32px ${UI_FONT}`, "سورة"),
  ]).catch(() => undefined);
  const logo = await loadImage("/images/logo.png");

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

  if (logo) {
    const lw = 300;
    const lh = (logo.height / logo.width) * lw;
    ctx.drawImage(logo, (L.w - lw) / 2, L.logoY - lh / 2, lw, lh);
  }

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
  if (lines.length > maxLines) {
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
  ctx.fillText(`سورة ${surahName(opts.surah)} · الآية ${toArabicDigits(opts.ayah)}`, L.w / 2, L.refY);
  ctx.font = `24px ${UI_FONT}`;
  ctx.fillStyle = C.muted;
  ctx.direction = "ltr";
  ctx.fillText(opts.site, L.w / 2, L.siteY);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"),
  );
}