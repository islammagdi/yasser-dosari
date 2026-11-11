import { NextResponse } from "next/server";
import { saveSubscription, validSubscription } from "@/lib/push/server";

/** اشتراك جهاز في الإشعارات (أو تحديث الأنواع اللي مشترك فيها) */
export async function POST(req: Request) {
  const text = await req.text();
  if (text.length > 5000) return NextResponse.json({ error: "too large" }, { status: 413 });
  let body: { subscription?: unknown; topics?: { recitations?: boolean } };
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  if (!validSubscription(body.subscription)) return NextResponse.json({ error: "invalid subscription" }, { status: 400 });
  await saveSubscription(body.subscription, { recitations: body.topics?.recitations !== false });
  return NextResponse.json({ ok: true });
}
