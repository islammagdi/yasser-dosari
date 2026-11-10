"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, assertAdmin, checkPassword } from "@/lib/admin/auth";
import { IMAMATE_TAG, cleanNights, cleanWeeks, loadImamateDoc, saveImamateDoc } from "@/lib/admin/imamateStore";
import { imamateFallback } from "@/lib/api/mock";

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
