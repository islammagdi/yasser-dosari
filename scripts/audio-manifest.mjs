/**
 * بيعمل manifest.json لملفات الصوت اللي هترفعها على R2.
 *
 * الاستخدام:
 *   node scripts/audio-manifest.mjs <فولدر الصوتيات> [رابط الـ bucket]
 *
 * - الفولدر فيه ملفات mp3 (أو m4a) اسمها ID فيديو يوتيوب (njE3hSECSa0.mp3)،
 *   ومسموح فولدرات جوه زي fard/ و taraweeh/ بنفس شكلها على R2.
 * - لو اديته رابط الـ bucket، بيجيب الفهرس الحالي ويضيف عليه بدل ما يمسحه.
 * - المدة بتتحسب من كل ملف، وبيطبع أي ملف اسمه مش شبه ID يوتيوب عشان تراجعه.
 * - الناتج: manifest.json جوه نفس الفولدر، ترفعه على R2 بعد ما ترفع الملفات.
 */
import { readdir, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { parseFile } from "music-metadata";

const [dir, base] = process.argv.slice(2);
if (!dir) {
  console.error("الاستخدام: node scripts/audio-manifest.mjs <فولدر الصوتيات> [رابط الـ bucket]");
  process.exit(1);
}

// ID يوتيوب: ١١ حرف من حروف إنجليزي وأرقام و - و _
const YT_ID = /^[A-Za-z0-9_-]{11}$/;

async function* mp3Files(root) {
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const full = join(root, entry.name);
    if (entry.isDirectory()) yield* mp3Files(full);
    else if (/\.(mp3|m4a)$/i.test(entry.name)) yield full;
  }
}

let manifest = {};
if (base) {
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/manifest.json`);
    if (res.ok) manifest = await res.json();
    console.log(`الفهرس الحالي فيه ${Object.keys(manifest).length} تسجيل`);
  } catch {
    console.warn("ماقدرتش أجيب الفهرس الحالي، هبدأ فهرس جديد");
  }
}

let added = 0;
const skipped = [];
for await (const file of mp3Files(dir)) {
  const path = relative(dir, file).split(sep).join("/");
  const id = path.split("/").pop().replace(/\.(mp3|m4a)$/i, "");
  if (!YT_ID.test(id)) {
    skipped.push(path);
    continue;
  }
  let duration;
  try {
    const meta = await parseFile(file, { duration: true });
    if (meta.format.duration) duration = Math.round(meta.format.duration);
  } catch {
    /* الملف مش مقروء: هنضيفه من غير مدة */
  }
  if (!manifest[id]) added++;
  manifest[id] = duration ? { file: path, duration } : { file: path };
}

await writeFile(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`✓ اتضاف ${added} تسجيل جديد، والفهرس فيه ${Object.keys(manifest).length} تسجيل`);
console.log(`  الملف: ${join(dir, "manifest.json")}`);
if (skipped.length) {
  console.log(`\n⚠ ${skipped.length} ملف اسمه مش ID يوتيوب، ومش متضاف:`);
  skipped.forEach((p) => console.log(`  - ${p}`));
}
