"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, assertAdmin, checkPassword } from "@/lib/admin/auth";
import { IMAMATE_TAG, cleanNights, cleanWeeks, loadImamateDoc, saveImamateDoc } from "@/lib/admin/imamateStore";
import { imamateFallback } from "@/lib/api/mock";
import { CATALOG_TAG, loadCatalog, saveCatalog, toEntry, type CatalogEntry } from "@/lib/admin/catalog";
import { MANIFEST_TAG, adminManifest } from "@/lib/admin/manifest";
import { fetchFromPlaylists, recordingFromTitle } from "@/lib/api/youtube";
import type { Category, LectureType } from "@/types";

export type ActionResult = { ok: true; message: string } | { ok: false; message: string };

export async function login(_: unknown, form: FormData): Promise<{ error?: string }> {
  const token = checkPassword(String(form.get("password") ?? ""));
  if (!token) {
    // تأخير بسيط عشان محاولات التخمين متبقاش سريعة
    await new Promise((r) => setTimeout(r, 1200));
    return { error: "كلمة المرور غير صحيحة" };
  }
  cookies().set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/admin");
}

export async function logout() {
  cookies().delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

/** الجدول الحالي: من R2 لو اتحفظ قبل كده، وإلا من الشيت عشان يتنقل */
async function currentDoc() {
  const doc = await loadImamateDoc();
  if (doc) return { weeks: doc.weeks, ramadan: doc.ramadan };
  const old = await imamateFallback();
  return { weeks: old.weeks, ramadan: old.nights };
}

function refreshSite() {
  revalidateTag(IMAMATE_TAG);
  revalidatePath("/");
  revalidatePath("/imamate");
}

export async function saveWeeks(weeks: unknown): Promise<ActionResult> {
  try {
    assertAdmin();
    const doc = await currentDoc();
    const clean = cleanWeeks(weeks);
    await saveImamateDoc({ weeks: clean, ramadan: doc.ramadan });
    refreshSite();
    return { ok: true, message: `تم حفظ ${clean.length} أسبوع وتحديث الموقع.` };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "تعذّر الحفظ" };
  }
}

/** بيحفظ ليالي سنة واحدة، ومبيلمسش السنين التانية */
export async function saveRamadanYear(year: number, nights: unknown): Promise<ActionResult> {
  try {
    assertAdmin();
    const doc = await currentDoc();
    const thisYear = cleanNights(nights).filter((n) => n.year === year);
    const others = doc.ramadan.filter((n) => n.year !== year);
    await saveImamateDoc({ weeks: doc.weeks, ramadan: [...others, ...thisYear] });
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
  if (v === "fard" || v === "taraweeh") return { category: v };
  if (v === "lectures:khutbah") return { category: "lectures", lectureType: "khutbah" };
  if (v === "lectures:lesson") return { category: "lectures", lectureType: "lesson" };
  return null;
}

/** بيضيف للكتالوج أي فيديو موجود في بلاي ليستات القناة ومش في الكتالوج، ومبيغيّرش اللي موجود */
export async function syncFromPlaylists(): Promise<ActionResult> {
  try {
    assertAdmin();
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
    assertAdmin();
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
}

/** تعديل تسجيل موجود في الكتالوج */
export async function updateEntry(videoId: string, patch: EntryPatch): Promise<ActionResult> {
  try {
    assertAdmin();
    const items = { ...((await loadCatalog())?.items ?? {}) };
    let e: CatalogEntry | undefined = items[videoId];
    if (!e) return { ok: false, message: "التسجيل غير موجود في الكتالوج" };

    // تغيير القسم: نعيد قراءة العنوان الأصلي بقواعد القسم الجديد (التاريخ والصلاة ورقم الليلة)
    const cls = patch.section ? parseSection(patch.section) : null;
    if (cls && (cls.category !== e.category || cls.lectureType !== e.lectureType)) {
      const r = recordingFromTitle(videoId, e.searchText || e.title || videoId, e.addedAt, cls);
      if (r) e = { ...toEntry(r)[1], durationSec: e.durationSec, hidden: e.hidden };
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
    };
    items[videoId] = e;
    await saveCatalog(items);
    refreshCatalog();
    return { ok: true, message: "تم الحفظ" };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "تعذّر الحفظ" };
  }
}

export async function refreshManifest() {
  assertAdmin();
  revalidateTag(MANIFEST_TAG);
  revalidatePath("/admin/recordings");
}
