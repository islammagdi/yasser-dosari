import { NextResponse } from "next/server";
import { sendDueImamateAlerts, sendDueWirdReminders } from "@/lib/push/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * المهمة الدورية من cron-job.org: بتبعت تذكيرات الورد اللي ميعادها جه،
 * وإشعار بداية صلاة الشيخ في الحرم. عشان الإشعار يوصل في وقته، خلّيها كل ٥ دقايق.
 * محمية بكلمة سر في الرابط (?key=) عشان محدش غيرك يقدر يشغّلها.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const key = new URL(req.url).searchParams.get("key");
  if (!secret || key !== secret) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    // كل واحدة لوحدها: لو واحدة وقعت التانية تكمّل
    const [wird, imamate] = await Promise.allSettled([sendDueWirdReminders(), sendDueImamateAlerts()]);
    const out = (r: PromiseSettledResult<unknown>) => (r.status === "fulfilled" ? r.value : { error: String(r.reason) });
    return NextResponse.json({ wird: out(wird), imamate: out(imamate) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "failed" }, { status: 500 });
  }
}
