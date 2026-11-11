import { NextResponse } from "next/server";
import { deleteWirdReminder, saveWirdReminder, validSubscription } from "@/lib/push/server";

/** تفعيل تذكير الورد اليومي على جهاز (أو تغيير الساعة) */
export async function POST(req: Request) {
  const text = await req.text();
  if (text.length > 5000) return NextResponse.json({ error: "too large" }, { status: 413 });
  let body: { subscription?: unknown; time?: string; tz?: string };
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(body.time ?? "") ? body.time! : null;
  const tz = typeof body.tz === "string" && body.tz.length < 60 ? body.tz : "Africa/Cairo";
  if (!validSubscription(body.subscription) || !time) return NextResponse.json({ error: "invalid" }, { status: 400 });
  await saveWirdReminder(body.subscription, time, tz);
  return NextResponse.json({ ok: true });
}

/** إيقاف التذكير */
export async function DELETE(req: Request) {
  try {
    const { endpoint } = (await req.json()) as { endpoint?: string };
    if (typeof endpoint !== "string" || !endpoint.startsWith("https://")) throw new Error();
    await deleteWirdReminder(endpoint);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
}
