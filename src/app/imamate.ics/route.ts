import { recordings } from "@/lib/api";
import { icsCalendar, imamateEvent } from "@/lib/calendar";
import { addDays, makkahToday } from "@/lib/imamate";
import { siteUrl } from "@/lib/site";

// التقويم بيتبني من نفس الجدول اللي في الموقع، وبيتحدّث كل ساعة
export const revalidate = 3600;

/**
 * /imamate.ics — تقويم اشتراك بكل مواعيد إمامة الشيخ.
 * اللي يشترك فيه مرة واحدة، المواعيد الجديدة بتنزل في تقويمه لوحدها كل أسبوع.
 */
export async function GET() {
  const slots = await recordings.imamate();
  // آخر شهر بس من اللي عدّى، عشان التقويم ميتقلش بمواعيد قديمة
  const from = addDays(makkahToday(new Date()), -30);
  const items = slots
    .filter((s) => s.date >= from)
    .map((s) => ({ event: imamateEvent(s, `${siteUrl}/imamate`), uid: s.id }));

  const body = icsCalendar(items, { name: "إمامة الشيخ ياسر الدوسري", refreshHours: 6 });
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="imamate.ics"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}