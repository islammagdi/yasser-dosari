/**
 * «فهرس في الأول» لملفات MP4/MOV في المتصفح، زي `ffmpeg -movflags +faststart` (أو qt-faststart).
 *
 * ملف الفيديو عبارة عن علب (atoms) ورا بعض: moov فيها الفهرس، وmdat فيها الصورة والصوت.
 * لو moov جاية بعد mdat، المتصفح لازم يحمّل الملف كله قبل ما يشغّل.
 * هنا بننقل moov قبل mdat، وبنزوّد أماكن الأجزاء جوه الفهرس (stco/co64) بحجم moov، لأن mdat اتزقت لقدام.
 * الصورة والصوت زي ما هما بالظبط، من غير أي إعادة ضغط.
 *
 * بيرجّع:
 *  - Blob جديد لو اتظبط
 *  - null لو الملف جاهز أصلًا، أو مش مفهوم (والرفع بيكمّل بالملف الأصلي)
 */

interface Atom {
  type: string;
  start: number;
  size: number;
}

/** العلب اللي جواها علب تانية، في الطريق لجداول أماكن الأجزاء */
const CONTAINERS = new Set(["moov", "trak", "mdia", "minf", "stbl", "edts", "dinf"]);

function readAtoms(view: DataView, from: number, to: number): Atom[] | null {
  const atoms: Atom[] = [];
  let pos = from;
  while (pos + 8 <= to) {
    let size = view.getUint32(pos);
    const type = String.fromCharCode(view.getUint8(pos + 4), view.getUint8(pos + 5), view.getUint8(pos + 6), view.getUint8(pos + 7));
    if (size === 1) {
      if (pos + 16 > to) return null;
      const big = view.getBigUint64(pos + 8);
      if (big > BigInt(Number.MAX_SAFE_INTEGER)) return null;
      size = Number(big);
    } else if (size === 0) {
      size = to - pos;
    }
    if (size < 8 || pos + size > to) return null;
    atoms.push({ type, start: pos, size });
    pos += size;
  }
  return atoms;
}

/** بيزوّد كل أماكن الأجزاء في الفهرس بـ shift. false لو حاجة مش مفهومة (فهرس مضغوط، أو مكان أكبر من ٤ جيجا) */
function shiftOffsets(view: DataView, atom: Atom, shift: number): boolean {
  const header = view.getUint32(atom.start) === 1 ? 16 : 8;
  const kids = readAtoms(view, atom.start + header, atom.start + atom.size);
  if (!kids) return false;
  for (const k of kids) {
    if (k.type === "cmov") return false; // فهرس مضغوط: مش هنلمسه
    if (CONTAINERS.has(k.type)) {
      if (!shiftOffsets(view, k, shift)) return false;
    } else if (k.type === "stco" || k.type === "co64") {
      const h = view.getUint32(k.start) === 1 ? 16 : 8;
      const count = view.getUint32(k.start + h + 4);
      const first = k.start + h + 8;
      const step = k.type === "stco" ? 4 : 8;
      if (first + count * step > k.start + k.size) return false;
      for (let i = 0; i < count; i++) {
        const at = first + i * step;
        if (k.type === "stco") {
          const v = view.getUint32(at) + shift;
          if (v > 0xffffffff) return false;
          view.setUint32(at, v);
        } else {
          view.setBigUint64(at, view.getBigUint64(at) + BigInt(shift));
        }
      }
    }
  }
  return true;
}

export async function faststart(file: Blob): Promise<Blob | null> {
  const buf = await file.arrayBuffer();
  const view = new DataView(buf);
  const atoms = readAtoms(view, 0, buf.byteLength);
  if (!atoms) return null;
  const moovIdx = atoms.findIndex((a) => a.type === "moov");
  const mdatIdx = atoms.findIndex((a) => a.type === "mdat");
  if (moovIdx < 0 || mdatIdx < 0 || moovIdx < mdatIdx) return null; // جاهز، أو مش ملف فيديو مفهوم

  const moov = atoms[moovIdx];
  // نسخة من الفهرس نعدّل فيها (الأصل يفضل زي ما هو لو حاجة فشلت)
  const moovCopy = buf.slice(moov.start, moov.start + moov.size);
  const moovView = new DataView(moovCopy);
  if (!shiftOffsets(moovView, { type: "moov", start: 0, size: moov.size }, moov.size)) return null;

  // الترتيب الجديد: كل اللي قبل mdat، بعدين الفهرس، بعدين الباقي (من غير الفهرس القديم)
  const parts: BlobPart[] = [];
  for (const a of atoms.slice(0, mdatIdx)) parts.push(buf.slice(a.start, a.start + a.size));
  parts.push(moovCopy);
  for (const a of atoms.slice(mdatIdx)) if (a !== moov) parts.push(buf.slice(a.start, a.start + a.size));
  return new Blob(parts, { type: file.type || "video/mp4" });
}
