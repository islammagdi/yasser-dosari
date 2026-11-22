/**
 * بيجهّز فيديوهات المقتطفات اللي على R2 للتشغيل السريع على الويب، من غير ما تحتاج ترفعها تاني.
 *
 * الاستخدام (من فولدر المشروع، ومحتاج ffmpeg متسطّب):
 *   node --env-file=.env.local scripts/optimize-clips.mjs            ← تجربة: بيفحص ويقولك هيعمل إيه بس
 *   node --env-file=.env.local scripts/optimize-clips.mjs --apply    ← تنفيذ: «فهرس في الأول» بس (سريع ومن غير ما الجودة تتغيّر)
 *   node --env-file=.env.local scripts/optimize-clips.mjs --apply --shrink ← كمان بيصغّر الكبير لـ 720p (أبطأ، وحجم أقل بكتير)
 *
 * بيعمل إيه مع كل فيديو في clips/:
 *  ١) بيقرا أول جزء من الملف بس ويشوف «الفهرس» (moov) قبل الفيديو (mdat) ولا بعده.
 *     لو بعده: المتصفح لازم يحمّل الملف كله قبل ما يشغّل، وده سبب التأخير.
 *  ٢) بياخد نسخة احتياطية من الأصل جوه R2 نفسه (backups/clips-original/) قبل أي تعديل.
 *  ٣) ffmpeg: بينقل الفهرس لأول الملف (-movflags +faststart). ومع --shrink: لو الفيديو أكبر من 720p
 *     أو تقيل (أكتر من ٣ ميجابت/ثانية)، بيعيد ضغطه لـ 720p.
 *  ٤) بيرفعه مكان الأصل بنفس الاسم، فالموقع مش محتاج أي تعديل.
 *
 * تقدر توقفه (Ctrl+C) وتشغّله تاني في أي وقت: اللي اتظبط بيعدّي عليه.
 * والأصل موجود في backups/clips-original/ لو احتجت ترجّعه.
 */
import { AwsClient } from "aws4fetch";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const shrink = args.includes("--shrink");
const only = args.find((a) => a.startsWith("--only="))?.slice(7); // تجربة على فيديو واحد: --only=clip-2026...

const endpoint = (process.env.R2_ENDPOINT ?? "").replace(/\/$/, "");
const bucket = process.env.R2_BUCKET ?? "audio";
if (!endpoint || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
  console.error("بيانات R2 مش موجودة. شغّل السكريبت بـ --env-file=.env.local من فولدر المشروع.");
  process.exit(1);
}
const r2 = new AwsClient({ accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY, service: "s3", region: "auto" });
const url = (key) => `${endpoint}/${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
const call = async (u, init = {}) => fetch(await r2.sign(u, init));

if (apply && spawnSync("ffmpeg", ["-version"]).status !== 0) {
  console.error("ffmpeg مش متسطّب أو مش في PATH. نزّله من https://www.gyan.dev/ffmpeg/builds/ (release essentials) وضيف فولدر bin للـ PATH.");
  process.exit(1);
}

/** كل الملفات تحت clips/ (بالصفحات، ١٠٠٠ في المرة) */
async function listClips() {
  const keys = [];
  let token = "";
  for (;;) {
    const q = new URLSearchParams({ "list-type": "2", prefix: "clips/", ...(token && { "continuation-token": token }) });
    const res = await call(`${endpoint}/${bucket}?${q}`);
    if (!res.ok) throw new Error(`R2 list: ${res.status} ${await res.text()}`);
    const xml = await res.text();
    for (const m of xml.matchAll(/<Contents>[\s\S]*?<Key>([^<]+)<\/Key>[\s\S]*?<Size>(\d+)<\/Size>[\s\S]*?<\/Contents>/g)) {
      keys.push({ key: m[1].replace(/&amp;/g, "&"), size: Number(m[2]) });
    }
    token = xml.match(/<NextContinuationToken>([^<]+)</)?.[1] ?? "";
    if (!token) break;
  }
  return keys.filter((k) => /\.(mp4|mov|m4v)$/i.test(k.key));
}

/**
 * الفهرس قبل الفيديو؟ بنقرا علب الملف من أوله (كل علبة: ٤ بايت طول + ٤ بايت اسم)
 * من غير ما نحمّل الملف كله: بنطلب بس الـ ١٦ بايت اللي في أول كل علبة.
 * بيرجّع "start" أو "end" أو null لو الملف مش مفهوم.
 */
async function moovPosition(key, size) {
  let pos = 0;
  for (let i = 0; i < 50 && pos < size; i++) {
    const res = await call(url(key), { headers: { Range: `bytes=${pos}-${Math.min(size - 1, pos + 15)}` } });
    const b = Buffer.from(await res.arrayBuffer());
    if (b.length < 8) return null;
    let len = b.readUInt32BE(0);
    const type = b.toString("latin1", 4, 8);
    if (len === 1 && b.length >= 16) len = Number(b.readBigUInt64BE(8));
    else if (len === 0) len = size - pos;
    if (type === "moov") return "start";
    if (type === "mdat") return "end";
    if (len < 8) return null;
    pos += len;
  }
  return null;
}

function probe(file) {
  const r = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=bit_rate,duration", "-of", "json", file], { encoding: "utf8" });
  try {
    const j = JSON.parse(r.stdout);
    return { w: j.streams?.[0]?.width ?? 0, h: j.streams?.[0]?.height ?? 0, kbps: Math.round(Number(j.format?.bit_rate ?? 0) / 1000) };
  } catch {
    return { w: 0, h: 0, kbps: 0 };
  }
}

const mb = (n) => `${(n / 1024 / 1024).toFixed(1)}MB`;

async function main() {
  const clips = (await listClips()).filter((c) => !only || c.key.includes(only));
  console.log(`لقيت ${clips.length} فيديو في clips/${apply ? "" : " (تجربة: مش هيتغيّر حاجة، ضيف --apply للتنفيذ)"}\n`);
  let fixed = 0;
  let skipped = 0;
  let failed = 0;
  let before = 0;
  let after = 0;

  for (const [i, c] of clips.entries()) {
    const tag = `[${i + 1}/${clips.length}] ${c.key} (${mb(c.size)})`;
    try {
      const moov = await moovPosition(c.key, c.size);
      // من غير --shrink: اللي فهرسه في الأول تمام. مع --shrink: بنفحصه كمان لو حجمه كبير
      const heavy = c.size > 12 * 1024 * 1024;
      if (moov === "start" && !(shrink && heavy)) {
        console.log(`✓ ${tag}: جاهز`);
        skipped++;
        continue;
      }
      if (!apply) {
        console.log(`• ${tag}: ${moov === "end" ? "الفهرس في الآخر (بيتأخر)" : moov === null ? "مش واضح، هيتفحص" : "تقيل"}`);
        fixed++;
        continue;
      }

      const dir = await mkdtemp(join(tmpdir(), "clip-"));
      const ext = c.key.match(/\.(\w+)$/)[1].toLowerCase();
      const src = join(dir, `in.${ext}`);
      const out = join(dir, `out.${ext}`);
      try {
        const res = await call(url(c.key));
        if (!res.ok) throw new Error(`تحميل: ${res.status}`);
        await writeFile(src, Buffer.from(await res.arrayBuffer()));
        const type = res.headers.get("content-type") || (ext === "mov" ? "video/quicktime" : "video/mp4");

        const info = probe(src);
        const big = Math.min(info.w, info.h) > 720 || info.kbps > 3000;
        const reencode = shrink && big;
        const ff = reencode
          ? [
              "-y", "-i", src,
              // الضلع الأصغر ٧٢٠ (طولي أو عرضي)
              "-vf", "scale='if(gt(iw,ih),-2,min(720,iw))':'if(gt(iw,ih),min(720,ih),-2)'",
              "-c:v", "libx264", "-preset", "medium", "-crf", "24", "-pix_fmt", "yuv420p",
              "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", out,
            ]
          : ["-y", "-i", src, "-c", "copy", "-map", "0", "-movflags", "+faststart", out];
        const r = spawnSync("ffmpeg", ff, { encoding: "utf8" });
        if (r.status !== 0) throw new Error(`ffmpeg: ${r.stderr.split("\n").slice(-3).join(" ")}`);
        const body = await readFile(out);

        // نسخة احتياطية جوه R2 (نسخ على السيرفر، من غير رفع تاني)
        const backupKey = `backups/clips-original/${c.key.slice("clips/".length)}`;
        const cp = await call(url(backupKey), { method: "PUT", headers: { "x-amz-copy-source": `/${bucket}/${c.key}` } });
        if (!cp.ok) throw new Error(`النسخة الاحتياطية: ${cp.status}`);

        const put = await call(url(c.key), { method: "PUT", body, headers: { "Content-Type": type, "Content-Length": String(body.length) } });
        if (!put.ok) throw new Error(`الرفع: ${put.status}`);

        before += c.size;
        after += (await stat(out)).size;
        fixed++;
        console.log(`✔ ${tag} → ${mb(body.length)} ${reencode ? `(اتضغط من ${info.w}×${info.h})` : "(الفهرس اتنقل لأول الملف)"}`);
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    } catch (e) {
      failed++;
      console.log(`✗ ${tag}: ${e.message}`);
    }
  }

  console.log(`\nجاهز من الأول: ${skipped} · ${apply ? "اتظبط" : "محتاج يتظبط"}: ${fixed} · فشل: ${failed}`);
  if (apply && before) console.log(`الحجم: ${mb(before)} ← ${mb(after)}`);
  if (failed) console.log("شغّل نفس الأمر تاني: اللي اتظبط هيعدّي عليه، والفاشل هيتجرّب تاني.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
