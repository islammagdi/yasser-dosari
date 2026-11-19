"use server";
import { CLIPS_KEY, CLIPS_TAG, type Clip } from "@/lib/clips";

import { revalidatePath, revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, assertAdmin, clearFailures, lockedMinutes, passwordMatches, recordFailure } from "@/lib/admin/auth";
import { cookieOptions, makeToken } from "@/lib/admin/session";
import { IMAMATE_TAG, cleanFridays, cleanNights, cleanWeeks, loadImamateDoc, saveImamateDoc } from "@/lib/admin/imamateStore";
import { imamateFallback } from "@/lib/api/mock";
import { BACKUP_FILES, restoreBackup, type BackupName } from "@/lib/admin/backup";
import { broadcast } from "@/lib/push/server";
import { DAILY_TAG, loadDaily, saveDaily } from "@/lib/admin/daily";
import { recordings } from "@/lib/api";
import { CATEGORIES } from "@/lib/categories";
import { CATALOG_TAG, isCustomKey, loadCatalog, saveCatalog, toEntry, type CatalogEntry } from "@/lib/admin/catalog";
import { MANIFEST_TAG, adminManifest } from "@/lib/admin/manifest";
import { fetchFromPlaylists, recordingFromTitle } from "@/lib/api/youtube";
import type { Category, LectureType } from "@/types";

export type ActionResult = { ok: true; message: string } | { ok: false; message: string };

export async function login(_: unknown, form: FormData): Promise<{ error?: string }> {
  const locked = await lockedMinutes();
  if (locked) return { error: `الدخول مقفول بسبب محاولات خاطئة كثيرة. حاول بعد ${locked} دقيقة.` };

  if (!passwordMatches(String(form.get("password") ?? ""))) {
    // تأخير بسيط عشان محاولات التخمين متبقاش سريعة
    await new Promise((r) => setTimeout(r, 1200));
    const left = await recordFailure();
    return {
      error: left === 0 ? "محاولات خاطئة كثيرة. الدخول مقفول ١٥ دقيقة." : `كلمة المرور غير صحيحة. باقي ${left} ${left === 1 ? "محاولة" : "محاولات"} قبل قفل الدخول.`,
    };
  }
  await clearFailures();
  const token = await makeToken(Date.now());
  if (!token) return { error: "باسورد اللوحة على Vercel قصير أو مش متظبط." };
  cookies().set(ADMIN_COOKIE, token, cookieOptions);
  redirect("/admin");
}

export async function logout() {
  cookies().delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

/** الجدول الحالي: من R2 لو اتحفظ قبل كده، وإلا من الشيت عشان يتنقل */
async function currentDoc() {
  const doc = await loadImamateDoc();
  if (doc) return { weeks: doc.weeks, ramadan: doc.ramadan, fridays: doc.fridays ?? [] };
  const old = await imamateFallback();
  return { weeks: old.weeks, ramadan: old.nights, fridays: [] };
}

function refreshSite() {
  revalidateTag(IMAMATE_TAG);
  revalidatePath("/");
  revalidatePath("/imamate");
}

export async function saveWeeks(weeks: unknown): Promise<ActionResult> {
  try {
    await assertAdmin();
    const doc = await currentDoc();
    const clean = cleanWeeks(weeks);
    await saveImamateDoc({ ...doc, weeks: clean });
    refreshSite();
    return { ok: true, message: `تم حفظ ${clean.length} أسبوع وتحديث الموقع.` };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "تعذّر الحفظ" };
  }
}

/** بيحفظ ليالي سنة واحدة، ومبيلمسش السنين التانية */
export async function saveRamadanYear(year: number, nights: unknown): Promise<ActionResult> {
  try {
    await assertAdmin();
    const doc = await currentDoc();
    const thisYear = cleanNights(nights).filter((n) => n.year === year);
    const others = doc.ramadan.filter((n) => n.year !== year);
    await saveImamateDoc({ ...doc, ramadan: [...others, ...thisYear] });
    refreshSite();
    return { ok: true, message: `تم حفظ جدول رمضان ${year} وتحديث الموقع.` };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "تعذّر الحفظ" };
  }
}

// ---------- التسجيلات (الكتالوج) ----------


function refreshCatalog() {
  revalidateTag(CATALOG_TAG);
  revalidatePath("/", "layout");
}

/** "fard" | "taraweeh" | "lectures:khutbah" | "lectures:lesson" ← القسم ونوع المحاضرة */
function parseSection(v: string): { category: Category; lectureType?: LectureType } | null {
  if (v === "fard" || v === "taraweeh" || v === "rare") return { category: v };
  if (v === "lectures:khutbah") return { category: "lectures", lectureType: "khutbah" };
  if (v === "lectures:lesson") return { category: "lectures", lectureType: "lesson" };
  return null;
}

/** بيضيف للكتالوج أي فيديو موجود في بلاي ليستات القناة ومش في الكتالوج، ومبيغيّرش اللي موجود */
export async function syncFromPlaylists(): Promise<ActionResult> {
  try {
    await assertAdmin();
    const items = { ...((await loadCatalog())?.items ?? {}) };
    let added = 0;
    for (const cat of ["fard", "taraweeh", "lectures"] as const) {
      for (const r of await fetchFromPlaylists(cat)) {
        const [id, entry] = toEntry(r);
        if (items[id]) continue;
        items[id] = entry;
        added++;
      }
    }
    await saveCatalog(items);
    refreshCatalog();
    return { ok: true, message: `تمت إضافة ${added} تسجيل، والكتالوج فيه ${Object.keys(items).length} تسجيل.` };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "تعذّر الإنشاء" };
  }
}

/** تصنيف تسجيل جديد من "بانتظار التصنيف" */
export async function classifyPending(videoId: string, section: string, titleOverride?: string): Promise<ActionResult> {
  try {
    await assertAdmin();
    const items = { ...((await loadCatalog())?.items ?? {}) };
    const meta = (await adminManifest())[videoId];
    if (section === "hidden") {
      items[videoId] = { category: "fard", title: meta?.title ?? videoId, hidden: true, durationSec: meta?.duration };
    } else {
      const cls = parseSection(section);
      const title = (titleOverride || meta?.title || "").trim();
      if (!cls) return { ok: false, message: "اختر القسم" };
      if (!title) return { ok: false, message: "اكتب عنوان التسجيل" };
      const r = recordingFromTitle(videoId, title, meta?.uploadedAt, cls);
      if (!r) return { ok: false, message: "تعذّر قراءة العنوان" };
      const [, entry] = toEntry(r);
      if (isCustomKey(videoId)) {
        // تسجيل خاص: من غير صورة يوتيوب، وتاريخ الإضافة = دلوقتي عشان يظهر كجديد
        delete entry.imageUrl;
        entry.addedAt = new Date().toISOString();
      }
      items[videoId] = { ...entry, durationSec: meta?.duration };
    }
    await saveCatalog(items);
    refreshCatalog();
    return { ok: true, message: "تم التصنيف" };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "تعذّر الحفظ" };
  }
}

export interface EntryPatch {
  section?: string;
  title?: string;
  subtitle?: string;
  hijriYear?: number | null;
  hijriMonth?: number | null;
  hijriDay?: number | null;
  hidden?: boolean;
  /** السور بإيدك؛ مصفوفة فاضية = نرجع نقرا من الوصف */
  surahs?: number[];
}

/** تعديل تسجيل موجود في الكتالوج */
export async function updateEntry(videoId: string, patch: EntryPatch): Promise<ActionResult> {
  try {
    await assertAdmin();
    const items = { ...((await loadCatalog())?.items ?? {}) };
    let e: CatalogEntry | undefined = items[videoId];
    if (!e) return { ok: false, message: "التسجيل غير موجود في الكتالوج" };

    // تغيير القسم: نعيد قراءة العنوان الأصلي بقواعد القسم الجديد (التاريخ والصلاة ورقم الليلة)
    const cls = patch.section ? parseSection(patch.section) : null;
    if (cls && (cls.category !== e.category || cls.lectureType !== e.lectureType)) {
      const r = recordingFromTitle(videoId, e.searchText || e.title || videoId, e.addedAt, cls);
      if (r) {
        const rebuilt = toEntry(r)[1];
        if (isCustomKey(videoId)) {
          delete rebuilt.imageUrl;
          rebuilt.addedAt = e.addedAt;
        }
        e = { ...rebuilt, durationSec: e.durationSec, hidden: e.hidden };
      }
    }
    const num = (v: number | null | undefined) => (v == null || Number.isNaN(v) ? undefined : v);
    e = {
      ...e,
      ...(patch.title !== undefined && { title: patch.title.trim() }),
      ...(patch.subtitle !== undefined && { subtitle: patch.subtitle.trim() || undefined }),
      ...(patch.hijriYear !== undefined && { hijriYear: num(patch.hijriYear) }),
      ...(patch.hijriMonth !== undefined && { hijriMonth: num(patch.hijriMonth) }),
      ...(patch.hijriDay !== undefined && { hijriDay: num(patch.hijriDay) }),
      ...(patch.hidden !== undefined && { hidden: patch.hidden || undefined }),
      ...(patch.surahs !== undefined && {
        surahs: [...new Set(patch.surahs.filter((n) => n >= 1 && n <= 114))].sort((a, b) => a - b),
      }),
    };
    if (e.surahs && !e.surahs.length) delete e.surahs;
    items[videoId] = e;
    await saveCatalog(items);
    refreshCatalog();
    return { ok: true, message: "تم الحفظ" };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "تعذّر الحفظ" };
  }
}

export async function refreshManifest() {
  await assertAdmin();
  revalidateTag(MANIFEST_TAG);
  revalidatePath("/admin/recordings");
}

// ---------- تلاوة اليوم ----------

/** كل تسجيلات الموقع (بما فيها المصحف) بالـ ID بتاع صفحتها */
async function allRecordingIds(): Promise<Map<string, string>> {
  const lists = await Promise.all(CATEGORIES.map((c) => recordings.list({ category: c.slug }).catch(() => [])));
  return new Map(lists.flat().map((r) => [r.id, r.title || r.prayerLabel || r.id]));
}

/** "https://…/fard/yt-abc" أو "yt-abc" ← "yt-abc" */
function recordingRef(input: string): string {
  const s = input.trim();
  try {
    return decodeURIComponent(new URL(s).pathname.split("/").filter(Boolean).pop() ?? "");
  } catch {
    return s;
  }
}

function refreshDaily() {
  revalidateTag(DAILY_TAG);
  revalidatePath("/");
}

export async function addDaily(input: string, date?: string): Promise<ActionResult> {
  try {
    await assertAdmin();
    const id = recordingRef(input);
    const all = await allRecordingIds();
    if (!all.has(id)) return { ok: false, message: "لم أجد تسجيلًا بهذا الرابط. انسخ رابط صفحة التلاوة من الموقع." };
    const doc: { pool: string[]; pinned: Record<string, string> } = (await loadDaily()) ?? { pool: [], pinned: {} };
    const pool = doc.pool.includes(id) ? doc.pool : [...doc.pool, id];
    const pinned = { ...doc.pinned };
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) pinned[date] = id;
    await saveDaily({ pool, pinned });
    refreshDaily();
    return { ok: true, message: date ? `تمت الإضافة وتثبيتها يوم ${date}` : `تمت الإضافة: ${all.get(id)}` };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "تعذّر الحفظ" };
  }
}

export async function removeDaily(id: string): Promise<ActionResult> {
  try {
    await assertAdmin();
    const doc: { pool: string[]; pinned: Record<string, string> } = (await loadDaily()) ?? { pool: [], pinned: {} };
    const pinned = Object.fromEntries(Object.entries(doc.pinned).filter(([, v]) => v !== id));
    await saveDaily({ pool: doc.pool.filter((x) => x !== id), pinned });
    refreshDaily();
    return { ok: true, message: "تم الحذف" };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "تعذّر الحذف" };
  }
}

export async function unpinDaily(date: string): Promise<ActionResult> {
  try {
    await assertAdmin();
    const doc: { pool: string[]; pinned: Record<string, string> } = (await loadDaily()) ?? { pool: [], pinned: {} };
    const pinned = { ...doc.pinned };
    delete pinned[date];
    await saveDaily({ pool: doc.pool, pinned });
    refreshDaily();
    return { ok: true, message: "تم إلغاء التثبيت" };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "تعذّر الحفظ" };
  }
}

// ---------- الإشعارات ----------

export async function sendPush(title: string, body: string, url: string): Promise<ActionResult> {
  try {
    await assertAdmin();
    if (!title.trim() || !body.trim()) return { ok: false, message: "اكتب العنوان والنص" };
    const path = url.trim() ? (url.trim().startsWith("/") ? url.trim() : new URL(url.trim()).pathname) : "/";
    const r = await broadcast("recitations", { title: title.trim(), body: body.trim(), url: path });
    return {
      ok: true,
      message: `تم الإرسال إلى ${r.sent} جهاز${r.removed ? `، وحذف ${r.removed} اشتراك منتهي` : ""}${r.failed ? `، وتعذّر ${r.failed}` : ""}.`,
    };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "تعذّر الإرسال" };
  }
}

// ---------- النسخ الاحتياطية ----------

export async function restoreBackupAction(name: string, key: string): Promise<ActionResult> {
  try {
    await assertAdmin();
    if (!(name in BACKUP_FILES)) return { ok: false, message: "ملف غير معروف" };
    await restoreBackup(name as BackupName, key);
    // الموقع واللوحة يقروا النسخة المسترجعة على طول
    revalidateTag(CATALOG_TAG);
    revalidateTag(IMAMATE_TAG);
    revalidateTag(DAILY_TAG);
    revalidatePath("/", "layout");
    return { ok: true, message: "تم الاسترجاع، والموقع اتحدّث." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "تعذّر الاسترجاع" };
  }
}

/** جُمَع الشيخ (خطيب وإمام، أو احتياطي) */
export async function saveFridays(fridays: unknown): Promise<ActionResult> {
  try {
    await assertAdmin();
    const doc = await currentDoc();
    const clean = cleanFridays(fridays);
    await saveImamateDoc({ ...doc, fridays: clean });
    refreshSite();
    return { ok: true, message: `تم حفظ ${clean.length} جمعة وتحديث الموقع.` };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "تعذّر الحفظ" };
  }
}

// ---------- رفع تسجيل من لوحة التحكم ----------
// المتصفح بيطلب روابط رفع مؤقتة، يرفع الملفات على R2 مباشرة، وبعدين يسجّل التسجيل في الفهرس.

export interface UploadSlot {
  id: string;
  audioKey: string;
  audioUrl: string;
  imageKey?: string;
  imageUrl?: string;
}

const AUDIO_EXT = /\.(mp3|m4a)$/i;
const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

/** روابط رفع لتسجيل واحد (وغلافه لو موجود). الاسم بيتعمل تلقائي، فاسم الملف عندك ممكن يبقى عربي */
export async function prepareUpload(audioName: string, imageName?: string): Promise<{ ok: true; slot: UploadSlot } | { ok: false; message: string }> {
  try {
    await assertAdmin();
    const audioExt = audioName.match(AUDIO_EXT)?.[1]?.toLowerCase();
    if (!audioExt) return { ok: false, message: "الصوت لازم يبقى mp3 أو m4a" };
    const imageExt = imageName?.match(IMAGE_EXT)?.[1]?.toLowerCase().replace("jpeg", "jpg");
    if (imageName && !imageExt) return { ok: false, message: "الغلاف لازم يبقى jpg أو png أو webp" };

    const { presignPut } = await import("@/lib/admin/r2");
    const now = new Date();
    const stamp = now.toISOString().slice(0, 10).replace(/-/g, "");
    const name = `rec-${stamp}-${Math.random().toString(36).slice(2, 8)}`;
    const audioKey = `custom/${name}.${audioExt}`;
    const imageKey = imageExt ? `custom/${name}.${imageExt}` : undefined;
    return {
      ok: true,
      slot: {
        id: `custom-${name}`,
        audioKey,
        audioUrl: await presignPut(audioKey),
        ...(imageKey && { imageKey, imageUrl: await presignPut(imageKey) }),
      },
    };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "تعذّر تجهيز الرفع" };
  }
}

/**
 * بعد ما الملفات تترفع: التسجيل بيتضاف للفهرس، ولو اخترت قسم بيتصنّف على طول.
 * الفهرس بيتقري من غير cache قبل التعديل، عشان منمسحش حاجة اتضافت من مكان تاني.
 */
export async function registerUpload(input: {
  slot: Pick<UploadSlot, "id" | "audioKey" | "imageKey">;
  title: string;
  duration?: number;
  section?: string;
  /** بيتحفظوا بعد التصنيف (لازم يكون فيه قسم) */
  subtitle?: string;
  hijriDay?: number;
  hijriMonth?: number;
  hijriYear?: number;
}): Promise<ActionResult> {
  try {
    await assertAdmin();
    const { getFresh, putJson } = await import("@/lib/admin/r2");
    const { id, audioKey, imageKey } = input.slot;
    if (!id.startsWith("custom-rec-") || !audioKey.startsWith("custom/")) return { ok: false, message: "بيانات الرفع غير صحيحة" };
    const title = input.title.trim();
    if (!title) return { ok: false, message: "اكتب عنوان التسجيل" };

    const manifest = (await getFresh<Record<string, unknown>>("manifest.json")) ?? {};
    manifest[id] = {
      file: audioKey,
      ...(input.duration && { duration: Math.round(input.duration) }),
      title,
      uploadedAt: new Date().toISOString(),
      ...(imageKey && { image: imageKey }),
    };
    await putJson("manifest.json", manifest);
    revalidateTag(MANIFEST_TAG);
    revalidatePath("/admin/recordings");

    if (input.section) {
      const r = await classifyPending(id, input.section, title);
      if (!r.ok) return { ok: false, message: `اترفع، بس التصنيف فشل: ${r.message}. صنّفه من صفحة التسجيلات.` };
      // الوصف والتاريخ اللي اتكتبوا بإيدك بيغلبوا على اللي اتقرا من العنوان
      const hasDate = input.hijriYear || input.hijriMonth || input.hijriDay;
      if (input.subtitle?.trim() || hasDate) {
        const u = await updateEntry(id, {
          ...(input.subtitle?.trim() && { subtitle: input.subtitle }),
          ...(hasDate && { hijriYear: input.hijriYear ?? null, hijriMonth: input.hijriMonth ?? null, hijriDay: input.hijriDay ?? null }),
        });
        if (!u.ok) return { ok: false, message: `اترفع واتصنّف، بس الوصف أو التاريخ محفظوش: ${u.message}` };
      }
      return { ok: true, message: "اترفع واتصنّف، وظاهر على الموقع" };
    }
    return { ok: true, message: "اترفع، ومستني التصنيف في صفحة التسجيلات" };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "تعذّر تسجيل الرفع" };
  }
}

// ---------- الأغلفة: ربط صورة بتسجيل خاص بعد رفعه ----------

/** رابط رفع لغلاف تسجيل موجود. الاسم فيه وقت عشان المتصفح ميعرضش الصورة القديمة من الـ cache */
export async function prepareCover(id: string, imageName: string): Promise<{ ok: true; key: string; url: string } | { ok: false; message: string }> {
  try {
    await assertAdmin();
    if (!isCustomKey(id)) return { ok: false, message: "الأغلفة للتسجيلات الخاصة بس (فيديوهات يوتيوب ليها صورتها)" };
    const ext = imageName.match(IMAGE_EXT)?.[1]?.toLowerCase().replace("jpeg", "jpg");
    if (!ext) return { ok: false, message: "الغلاف لازم يبقى jpg أو png أو webp" };
    const { presignPut } = await import("@/lib/admin/r2");
    const key = `custom/${id.slice("custom-".length)}-cover-${Date.now().toString(36)}.${ext}`;
    return { ok: true, key, url: await presignPut(key) };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "تعذّر تجهيز الرفع" };
  }
}

/** بعد رفع الغلاف: بيتسجّل في الفهرس مكان القديم، والقديم بيتمسح من R2 */
export async function attachCover(id: string, key: string): Promise<ActionResult> {
  try {
    await assertAdmin();
    if (!isCustomKey(id) || !key.startsWith(`custom/${id.slice("custom-".length)}`)) return { ok: false, message: "بيانات الغلاف غير صحيحة" };
    const { deleteKey, getFresh, putJson } = await import("@/lib/admin/r2");
    const manifest = (await getFresh<Record<string, { image?: string }>>("manifest.json")) ?? {};
    const entry = manifest[id];
    if (!entry) return { ok: false, message: "التسجيل مش موجود في الفهرس" };
    const old = entry.image;
    manifest[id] = { ...entry, image: key };
    await putJson("manifest.json", manifest);
    if (old && old !== key) await deleteKey(old).catch(() => undefined);
    revalidateTag(MANIFEST_TAG);
    refreshCatalog();
    revalidatePath("/admin/recordings");
    revalidatePath("/admin/upload");
    return { ok: true, message: "الغلاف اتحفظ" };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "تعذّر حفظ الغلاف" };
  }
}

// ---------- مسح تسجيلات لسه متصنّفتش ----------
// أي تسجيل في "بانتظار التصنيف" (مرفوع منك أو صوت فيديو من يوتيوب): ملفاته من R2 وسطره من الفهرس.
// التسجيلات المصنّفة مبتتمسحش من هنا (ليها "إخفاء من الموقع").

/** ملفات الصوت والصور بس، عشان مستحيل نمسح ملف بيانات بالغلط */
const DELETABLE = /\.(mp3|m4a|jpe?g|png|webp)$/i;

export async function deletePendingMany(ids: string[]): Promise<ActionResult & { deleted?: string[] }> {
  try {
    await assertAdmin();
    if (!ids.length) return { ok: false, message: "مفيش تسجيلات محددة" };
    const catalog = (await loadCatalog())?.items ?? {};
    const { deleteKey, getFresh, putJson } = await import("@/lib/admin/r2");
    const manifest = (await getFresh<Record<string, { file?: string; image?: string }>>("manifest.json")) ?? {};
    const deleted: string[] = [];
    const files: string[] = [];
    for (const id of ids) {
      const entry = manifest[id];
      if (!entry || catalog[id]) continue;
      delete manifest[id];
      deleted.push(id);
      for (const k of [entry.file, entry.image]) if (k && DELETABLE.test(k) && !k.startsWith("admin/")) files.push(k);
    }
    if (!deleted.length) return { ok: false, message: "التسجيلات دي مش في «بانتظار التصنيف»" };
    // الفهرس الأول في كتابة واحدة، والملفات بعده: لو المسح وقع في النص، الموقع مش هيشاور على ملف مش موجود
    await putJson("manifest.json", manifest);
    for (const k of files) await deleteKey(k).catch(() => undefined);
    revalidateTag(MANIFEST_TAG);
    revalidatePath("/admin/recordings");
    revalidatePath("/admin/upload");
    return { ok: true, deleted, message: deleted.length === 1 ? "اتمسح نهائيًا" : `اتمسح ${deleted.length} تسجيل نهائيًا` };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "تعذّر المسح" };
  }
}

export async function deletePending(id: string): Promise<ActionResult> {
  return deletePendingMany([id]);
}

/**
 * بعد رفع دفعة تسجيلات: إشعار واحد للمشتركين (عشان ١٠ ملفات متبقاش ١٠ إشعارات).
 * تسجيل واحد: إشعار باسمه ورابطه. أكتر: "اتضافت ٣ تلاوات جديدة".
 */
export async function notifyNewUploads(ids: string[]): Promise<ActionResult> {
  try {
    await assertAdmin();
    const items = (await loadCatalog())?.items ?? {};
    const shown = ids.filter((id) => items[id] && !items[id].hidden);
    if (!shown.length) return { ok: true, message: "مفيش تسجيلات ظاهرة نبعت عنها" };
    const first = items[shown[0]];
    const msg =
      shown.length === 1
        ? { title: "تلاوة جديدة للشيخ ياسر الدوسري", body: first.title || first.prayerLabel || "", url: `/${first.category}/${shown[0]}` }
        : { title: "تلاوات جديدة للشيخ ياسر الدوسري", body: `اتضافت ${shown.length.toLocaleString("ar-EG")} تلاوات جديدة`, url: "/" };
    const r = await broadcast("recitations", msg);
    return { ok: true, message: `اتبعت الإشعار لـ ${r.sent} مشترك` };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "تعذّر إرسال الإشعار" };
  }
}

// ---------- «مقتطفات»: رفع وإدارة المقاطع القصيرة ----------

const VIDEO_EXT = /\.(mp4|webm|mov|m4v)$/i;

/** روابط رفع مؤقتة للفيديو وصورته المصغّرة */
export async function prepareClip(
  videoName: string,
): Promise<{ ok: true; id: string; videoKey: string; videoUrl: string; posterKey: string; posterUrl: string } | { ok: false; message: string }> {
  try {
    await assertAdmin();
    const ext = videoName.match(VIDEO_EXT)?.[1]?.toLowerCase().replace("m4v", "mp4");
    if (!ext) return { ok: false, message: "الفيديو لازم يبقى mp4 أو webm أو mov" };
    const { presignPut } = await import("@/lib/admin/r2");
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const id = `clip-${stamp}-${Math.random().toString(36).slice(2, 8)}`;
    const videoKey = `clips/${id}.${ext}`;
    const posterKey = `clips/${id}-poster.jpg`;
    return { ok: true, id, videoKey, videoUrl: await presignPut(videoKey), posterKey, posterUrl: await presignPut(posterKey) };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "تعذّر تجهيز الرفع" };
  }
}

export interface ClipInput {
  title: string;
  description?: string;
  /** فاضي لو المقطع من إنتاجك */
  sourceUrl?: string;
  sourceName?: string;
  recordingId?: string;
  surah?: number;
  ayahFrom?: number;
  ayahTo?: number;
}

function cleanClip(input: ClipInput): ClipInput | string {
  const title = input.title.trim();
  if (!title) return "اكتب عنوان المقطع";
  // المصدر اختياري (المقطع ممكن يكون من إنتاجك)، بس لو اتكتب لازم يبقى رابط صحيح
  let sourceUrl: string | undefined = input.sourceUrl?.trim() || undefined;
  if (sourceUrl) {
    try {
      sourceUrl = new URL(sourceUrl).toString();
    } catch {
      return "رابط المقطع الأصلي مش صحيح";
    }
  }
  const n = (v?: number) => (v && Number.isFinite(v) && v > 0 ? Math.round(v) : undefined);
  const surah = n(input.surah);
  if (surah && surah > 114) return "رقم السورة لازم يبقى من ١ لـ ١١٤";
  return {
    title,
    description: input.description?.trim() || undefined,
    sourceUrl,
    sourceName: input.sourceName?.trim() || undefined,
    recordingId: input.recordingId?.trim() || undefined,
    surah,
    ayahFrom: surah ? n(input.ayahFrom) : undefined,
    ayahTo: surah ? n(input.ayahTo) ?? n(input.ayahFrom) : undefined,
  };
}

function refreshClips() {
  revalidateTag(CLIPS_TAG);
  revalidatePath("/clips");
  revalidatePath("/");
  revalidatePath("/admin/clips");
}

/** بعد رفع الفيديو: المقطع بيتضاف لـ clips.json، ولو اخترت بيتبعت إشعار */
export async function saveClip(input: ClipInput & { id: string; videoKey: string; posterKey?: string; notify?: boolean }): Promise<ActionResult> {
  try {
    await assertAdmin();
    if (!input.id.startsWith("clip-") || !input.videoKey.startsWith(`clips/${input.id}`)) return { ok: false, message: "بيانات الرفع غير صحيحة" };
    const meta = cleanClip(input);
    if (typeof meta === "string") return { ok: false, message: meta };
    const { getFresh, putJson } = await import("@/lib/admin/r2");
    const list = (await getFresh<Clip[]>(CLIPS_KEY)) ?? [];
    const clip: Clip = {
      id: input.id,
      ...meta,
      videoKey: input.videoKey,
      ...(input.posterKey?.startsWith(`clips/${input.id}`) && { posterKey: input.posterKey }),
      createdAt: new Date().toISOString(),
    } as Clip;
    await putJson(CLIPS_KEY, [...list.filter((c) => c.id !== clip.id), clip]);
    refreshClips();
    if (input.notify) {
      const r = await broadcast("recitations", { title: "مقتطف جديد للشيخ ياسر الدوسري", body: clip.title, url: `/clips?c=${clip.id}` });
      return { ok: true, message: `اتضاف، واتبعت الإشعار لـ ${r.sent} مشترك` };
    }
    return { ok: true, message: "اتضاف للمقتطفات" };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "تعذّر حفظ المقطع" };
  }
}

/** تعديل بيانات مقطع موجود (من غير الفيديو)، أو إخفاؤه */
export async function updateClip(id: string, patch: Partial<ClipInput> & { hidden?: boolean }): Promise<ActionResult> {
  try {
    await assertAdmin();
    const { getFresh, putJson } = await import("@/lib/admin/r2");
    const list = (await getFresh<Clip[]>(CLIPS_KEY)) ?? [];
    const i = list.findIndex((c) => c.id === id);
    if (i < 0) return { ok: false, message: "المقطع مش موجود" };
    const cur = list[i];
    let next: Clip = { ...cur, ...(patch.hidden !== undefined && { hidden: patch.hidden || undefined }) };
    if (Object.keys(patch).some((k) => k !== "hidden")) {
      const meta = cleanClip({ ...cur, ...patch } as ClipInput);
      if (typeof meta === "string") return { ok: false, message: meta };
      next = { ...next, ...meta };
    }
    list[i] = next;
    await putJson(CLIPS_KEY, list);
    refreshClips();
    return { ok: true, message: patch.hidden === true ? "اتخفى من الموقع" : patch.hidden === false ? "ظاهر على الموقع" : "اتحفظ" };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "تعذّر الحفظ" };
  }
}

/** مسح مقطع نهائيًا: من القايمة، وملفاته من R2 */
export async function deleteClip(id: string): Promise<ActionResult> {
  try {
    await assertAdmin();
    const { deleteKey, getFresh, putJson } = await import("@/lib/admin/r2");
    const list = (await getFresh<Clip[]>(CLIPS_KEY)) ?? [];
    const clip = list.find((c) => c.id === id);
    if (!clip) return { ok: false, message: "المقطع مش موجود" };
    await putJson(
      CLIPS_KEY,
      list.filter((c) => c.id !== id),
    );
    for (const k of [clip.videoKey, clip.posterKey]) if (k?.startsWith("clips/")) await deleteKey(k).catch(() => undefined);
    refreshClips();
    return { ok: true, message: "اتمسح" };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "تعذّر المسح" };
  }
}
