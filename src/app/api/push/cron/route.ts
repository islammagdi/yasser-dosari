import { NextResponse } from "next/server";
import { sendDueWirdReminders } from "@/lib/push/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * المهمة الدورية (كل ١٥ دقيقة من cron-job.org): بتبعت تذكيرات الورد اللي ميعادها جه.
 * محمية بكلمة سر في الرابط (?key=) عشان محدش غيرك يقدر يشغّلها.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const key = new URL(req.url).searchParams.get("key");
  if (!secret || key !== secret) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await sendDueWirdReminders());
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "failed" }, { status: 500 });
  }
}
