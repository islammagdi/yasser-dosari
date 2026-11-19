import { NextResponse } from "next/server";
import { recordings } from "@/lib/api";
import { getCategory } from "@/lib/categories";
import { r2Enabled } from "@/lib/admin/r2";
import { saveReport } from "@/lib/admin/reports";
import { NOTE_MAX, isReason } from "@/lib/reportReasons";

export const dynamic = "force-dynamic";

const fail = (message: string, status = 400) => NextResponse.json({ ok: false, message }, { status });

/** «بلّغ عن مشكلة» من صفحة التلاوة */
export async function POST(req: Request) {
  if (!r2Enabled()) return fail("البلاغات مش متاحة دلوقتي.", 503);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail("طلب غير صالح.");
  }

  // الخانة المخفية: الزائر مبيشوفهاش، فلو اتملت يبقى بوت. بنرد بنجاح عشان ميحاولش تاني
  if (typeof body.website === "string" && body.website.trim()) return NextResponse.json({ ok: true });

  const recordingId = typeof body.recordingId === "string" ? body.recordingId.slice(0, 200) : "";
  const category = getCategory(typeof body.category === "string" ? body.category : "");
  if (!recordingId || !category || !isReason(body.reason)) return fail("بيانات البلاغ ناقصة.");

  // البلاغ لازم يبقى عن تلاوة موجودة فعلًا على الموقع
  const exists = (await recordings.list({ category: category.slug })).some((r) => r.id === recordingId);
  if (!exists) return fail("التلاوة مش موجودة.", 404);

  const note = typeof body.note === "string" ? body.note.trim().slice(0, NOTE_MAX) : "";
  const at = Number(body.at);

  try {
    const result = await saveReport({
      recordingId,
      category: category.slug,
      reason: body.reason,
      ...(note && { note }),
      ...(Number.isFinite(at) && at > 0 && at < 24 * 3600 && { at: Math.floor(at) }),
      ua: (req.headers.get("user-agent") ?? "").slice(0, 200),
    });
    if (result === "limit") return fail("وصلنا بلاغات كتير عن التلاوة دي، وهنراجعها قريب إن شاء الله.", 429);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("report:", err);
    return fail("حصلت مشكلة في الإرسال. جرّب تاني بعد شوية.", 500);
  }
}
