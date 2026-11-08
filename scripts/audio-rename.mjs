/**
 * بيغيّر أسامي ملفات الصوت من عنوان الفيديو لـ ID الفيديو على يوتيوب.
 *
 * الاستخدام (من فولدر المشروع):
 *   node --env-file=.env.local scripts/audio-rename.mjs "D:\audio"           ← تجربة: بيوريك هيعمل إيه بس
 *   node --env-file=.env.local scripts/audio-rename.mjs "D:\audio" --apply   ← تنفيذ فعلي
 *
 * - بيجيب كل فيديوهات القناة (العنوان والـ ID) من يوتيوب بمفتاح YOUTUBE_API_KEY اللي في .env.local.
 * - لو اسم الملف فيه الـ ID أصلًا (زي "العنوان [njE3hSECSa0].mp3")، بياخده منه على طول.
 * - غير كده بيقارن اسم الملف بعناوين الفيديوهات، بعد ما يشيل الرموز اللي ويندوز بيمنعها في الأسامي.
 * - الملفات اللي اسمها ID أصلًا بيسيبها، واللي مالقاش لها فيديو أو لقى أكتر من فيديو بيطبعها لك وميغيّرهاش.
 */
import { readdir, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname, extname, join, relative } from "node:path";

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith("--"));
const apply = args.includes("--apply");
const videosFile = args.find((a) => a.startsWith("--videos="))?.slice(9); // للتجربة من غير يوتيوب
if (!dir) {
  console.error('الاستخدام: node --env-file=.env.local scripts/audio-rename.mjs "D:\\audio" [--apply]');
  process.exit(1);
}

const KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID ?? "UClncV9OLPto_MinRzGfjr2g";
const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const ID_IN_NAME = /\[([A-Za-z0-9_-]{11})\]/;
const AUDIO_EXT = new Set([".mp3", ".m4a"]);

/** كل فيديوهات القناة: { id, title } */
async function channelVideos() {
  if (videosFile) {
    const { readFile } = await import("node:fs/promises");
    return JSON.parse(await readFile(videosFile, "utf8"));
  }
  if (!KEY) throw new Error("YOUTUBE_API_KEY مش موجود. شغّل السكريبت بـ --env-file=.env.local من فولدر المشروع.");
  const api = (path) => fetch(`https://www.googleapis.com/youtube/v3/${path}&key=${KEY}`).then((r) => r.json());
  const ch = await api(`channels?part=contentDetails&id=${CHANNEL_ID}`);
  const uploads = ch.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) throw new Error("ماقدرتش أوصل لفيديوهات القناة. اتأكد من المفتاح ومن ID القناة.");
  const out = [];
  let page = "";
  do {
    const res = await api(`playlistItems?part=snippet&maxResults=50&playlistId=${uploads}${page ? `&pageToken=${page}` : ""}`);
    if (res.error) throw new Error(res.error.message);
    for (const it of res.items ?? []) out.push({ id: it.snippet.resourceId.videoId, title: it.snippet.title });
    page = res.nextPageToken ?? "";
    process.stdout.write(`\rجبت ${out.length} فيديو…`);
  } while (page);
  process.stdout.write("\n");
  return out;
}

/** بيخلي العنوان واسم الملف قابلين للمقارنة: من غير تشكيل ورموز ومسافات زيادة */
function normalize(s) {
  return s
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, "") // تشكيل وتطويل
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660)) // أرقام عربي ← إنجليزي
    .replace(/[^\p{L}\p{N}]+/gu, " ") // أي رمز (: ? | " … وبدايلها اللي برامج التحميل بتحطها) ← مسافة
    .trim()
    .toLowerCase();
}

async function* audioFiles(root) {
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const full = join(root, entry.name);
    if (entry.isDirectory()) yield* audioFiles(full);
    else if (AUDIO_EXT.has(extname(entry.name).toLowerCase())) yield full;
  }
}

const videos = await channelVideos();
const byTitle = new Map();
for (const v of videos) {
  const k = normalize(v.title);
  byTitle.set(k, [...(byTitle.get(k) ?? []), v.id]);
}

let renamed = 0, already = 0;
const notFound = [], ambiguous = [], clashes = [];
for await (const file of audioFiles(dir)) {
  const ext = extname(file);
  const name = basename(file, ext);
  if (YT_ID.test(name)) { already++; continue; }

  let id = name.match(ID_IN_NAME)?.[1];
  if (!id) {
    const ids = byTitle.get(normalize(name)) ?? [];
    if (ids.length === 0) { notFound.push(file); continue; }
    if (ids.length > 1) { ambiguous.push(`${relative(dir, file)}  ←  ${ids.join(" أو ")}`); continue; }
    id = ids[0];
  }
  const target = join(dirname(file), `${id}${ext.toLowerCase()}`);
  if (existsSync(target)) { clashes.push(`${relative(dir, file)}  ←  ${id} موجود بالفعل`); continue; }
  console.log(`${apply ? "✓" : "•"} ${relative(dir, file)}  →  ${id}${ext.toLowerCase()}`);
  if (apply) await rename(file, target);
  renamed++;
}

console.log(`\n${apply ? "اتغيّر اسم" : "هيتغيّر اسم"} ${renamed} ملف، و${already} ملف اسمه ID من الأول.`);
if (notFound.length) {
  console.log(`\n⚠ ${notFound.length} ملف مالقيتلوش فيديو بنفس العنوان (غيّر اسمه بإيدك للـ ID):`);
  notFound.forEach((f) => console.log(`  - ${relative(dir, f)}`));
}
if (ambiguous.length) {
  console.log(`\n⚠ ${ambiguous.length} ملف عنوانه مكرر في أكتر من فيديو (اختار الصح بإيدك):`);
  ambiguous.forEach((l) => console.log(`  - ${l}`));
}
if (clashes.length) {
  console.log(`\n⚠ ${clashes.length} ملف اسمه الجديد موجود قبل كده (غالبًا نسخة مكررة):`);
  clashes.forEach((l) => console.log(`  - ${l}`));
}
if (!apply && renamed) console.log('\nلو الكلام ده مظبوط، شغّل نفس الأمر وزوّد في آخره: --apply');
