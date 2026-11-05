import type { Metadata } from "next";
import { recordings } from "@/lib/api";
import { toArabicDigits } from "@/lib/format";
import { IMAMATE_PRAYER_LABELS, NIGHT_PART_LABELS, hijriDayLabel, makkahToday } from "@/lib/imamate";
import { siteUrl } from "@/lib/site";
import type { ImamateSlot } from "@/types";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "جدول إمامة الشيخ",
  description: "مواعيد إمامة الشيخ ياسر الدوسري في المسجد الحرام حسب الجدول المعلن، مع اشتراك في التقويم يضيف المواعيد الجديدة تلقائيًا.",
  alternates: { canonical: "/imamate" },
};

/** "05:12" ← "٥:١٢ ص" بتوقيت مكة */
function clock(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return `${toArabicDigits(h % 12 || 12)}:${String(m).padStart(2, "0").replace(/\d/g, (d) => toArabicDigits(Number(d)))} ${h < 12 ? "ص" : "م"}`;
}

function groupByDay(slots: ImamateSlot[]): [string, ImamateSlot[]][] {
  const days = new Map<string, ImamateSlot[]>();
  for (const s of slots) days.set(s.date, [...(days.get(s.date) ?? []), s]);
  return Array.from(days.entries());
}

export default async function ImamatePage() {
  const slots = await recordings.imamate();
  const today = makkahToday(new Date());
  const upcoming = slots
    .filter((s) => s.date >= today)
    .sort((a, b) => (a.date + (a.start ?? "")).localeCompare(b.date + (b.start ?? "")));
  const days = groupByDay(upcoming);

  // webcal:// بيفتح تطبيق التقويم على الجهاز مباشرة (آيفون وماك وأوتلوك)
  const feed = `${siteUrl}/imamate.ics`;
  const webcal = feed.replace(/^https?:/, "webcal:");
  const google = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`;

  return (
    <>
      <div aria-hidden className="pattern-stars page-pattern" />
      <div className="flex flex-col gap-10">
        <header className="flex flex-col gap-2">
          <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">جدول إمامة الشيخ</h1>
          <p className="max-w-2xl text-lg leading-8 text-muted">
            مواعيد إمامة الشيخ ياسر الدوسري في المسجد الحرام حسب الجدول الأسبوعي المعلن. الأوقات المذكورة هي وقت الأذان بتوقيت مكة المكرمة، وتُقام الصلاة بعده بدقائق.
          </p>
        </header>

        <section aria-labelledby="subscribe-title" className="glass-card flex flex-col gap-4 rounded-3xl p-5 sm:p-6">
          <div className="flex flex-col gap-1">
            <h2 id="subscribe-title" className="font-display text-2xl font-bold text-gold-soft">
              اشترك في التقويم
            </h2>
            <p className="leading-7 text-muted">
              اشترك مرة واحدة، وكل موعد جديد يُعلَن ينزل في تقويم جوالك تلقائيًا، مع تنبيه قبل الصلاة بنصف ساعة.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={google}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center rounded-full bg-gold px-5 text-[15px] font-semibold text-gold-ink transition-colors hover:bg-gold-soft"
            >
              تقويم Google
            </a>
            <a
              href={webcal}
              className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-5 text-[15px] font-semibold text-gold-soft transition-colors hover:border-gold/50"
            >
              تقويم الآيفون والجهاز
            </a>
          </div>
          <p className="text-sm leading-6 text-muted">
            تطبيق آخر؟ أضف هذا الرابط كتقويم بالاشتراك:{" "}
            <span dir="ltr" className="select-all break-all font-mono text-[13px] text-text">
              {feed}
            </span>
          </p>
        </section>

        <section aria-labelledby="schedule-title" className="flex flex-col gap-4">
          <h2 id="schedule-title" className="px-1 font-display text-2xl font-bold text-gold-soft">
            المواعيد القادمة
          </h2>
          {days.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-line-strong px-6 py-10 text-center text-muted">
              لا توجد إمامة معلنة حاليًا، ويُعلن الجدول أسبوعيًا. اشترك في التقويم ليصلك الموعد فور إعلانه.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {days.map(([date, list]) => (
                <li
                  key={date}
                  className={`flex flex-col gap-2 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
                    date === today ? "border-gold/40 bg-gold/5" : "border-line"
                  }`}
                >
                  <span className="font-semibold">
                    {hijriDayLabel(date)}
                    {date === today && <span className="ms-2 text-sm font-medium text-gold">اليوم</span>}
                  </span>
                  <span className="flex flex-wrap gap-2">
                    {list.map((s) => (
                      <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-sm">
                        <span className="font-semibold text-gold-soft">{IMAMATE_PRAYER_LABELS[s.prayer]}</span>
                        {s.part && <span className="text-muted">({NIGHT_PART_LABELS[s.part]})</span>}
{s.start && <span className="text-muted">الأذان {clock(s.start)}</span>}
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}