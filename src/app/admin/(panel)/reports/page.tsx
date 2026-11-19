import Link from "next/link";
import type { Recording } from "@/types";
import { recordings } from "@/lib/api";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { formatDuration, toArabicDigits } from "@/lib/format";
import { loadReportGroups } from "@/lib/admin/reports";
import { reasonLabel } from "@/lib/reportReasons";
import { DeleteReportButton, ReportPlayer, ResolveButton } from "./controls";

const when = (iso: string) => new Date(iso).toLocaleString("ar-EG", { timeZone: "Africa/Cairo", dateStyle: "medium", timeStyle: "short" });

/** نوع الجهاز بكلمتين من الـ user agent */
function device(ua?: string): string {
  if (!ua) return "";
  const os = /iPhone|iPad/.test(ua) ? "آيفون" : /Android/.test(ua) ? "أندرويد" : /Windows/.test(ua) ? "ويندوز" : /Mac OS/.test(ua) ? "ماك" : /Web0S|webOS|SmartTV|Tizen/i.test(ua) ? "تلفزيون" : "";
  const browser = /Edg\//.test(ua) ? "Edge" : /SamsungBrowser/.test(ua) ? "Samsung" : /CriOS|Chrome\//.test(ua) ? "Chrome" : /FxiOS|Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "";
  return [os, browser].filter(Boolean).join("، ");
}

export default async function AdminReportsPage() {
  const groups = await loadReportGroups();

  // بيانات التلاوات (العنوان والصوت) من نفس المصدر اللي الموقع بيعرض منه
  const lists = await Promise.all(CATEGORIES.map((c) => recordings.list({ category: c.slug }).catch(() => [] as Recording[])));
  const byId = new Map(lists.flat().map((r) => [r.id, r]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-4xl font-bold">البلاغات</h1>
        <p className="max-w-2xl leading-7 text-muted">
          مشاكل بلّغ عنها الزوار من صفحة التلاوة. بعد ما تصلّح التلاوة اضغط «اتحلّت» علشان تتمسح بلاغاتها، ولو بلاغ مش مشكلة حقيقية اضغط «تجاهل» جنبه.
        </p>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-2xl border border-line p-5 text-muted">مفيش بلاغات دلوقتي.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {groups.map((g) => {
            const r = byId.get(g.recordingId);
            const category = getCategory(g.category);
            const times = g.reports.map((x) => x.at).filter((t): t is number => !!t);
            return (
              <li key={g.recordingId} className="glass-card flex flex-col gap-4 rounded-3xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    {category && <span className="text-sm text-gold">{category.title}</span>}
                    <h2 className="font-display text-2xl font-bold leading-snug">{r?.title ?? g.recordingId}</h2>
                    {!r && <span className="text-sm text-[#E5636B]">التلاوة دي مبقتش ظاهرة على الموقع (اتمسحت أو اتخفت).</span>}
                  </div>
                  <span className="rounded-full bg-gold/15 px-3 py-1 text-sm font-semibold text-gold-soft">
                    {g.reports.length === 1 ? "بلاغ واحد" : `${toArabicDigits(g.reports.length)} بلاغات`}
                  </span>
                </div>

                {r && <ReportPlayer audioUrl={r.audioUrl || undefined} youtubeId={r.youtubeId} times={times} />}

                <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line">
                  {g.reports.map((x) => (
                    <li key={x.key} className="flex flex-wrap items-start justify-between gap-2 p-3 text-sm">
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className="font-semibold">
                          {reasonLabel(x.reason)}
                          {x.at ? <span className="ms-2 font-normal tabular-nums text-gold-soft">عند {formatDuration(x.at)}</span> : null}
                        </span>
                        {x.note && <p className="leading-6">{x.note}</p>}
                        <span className="text-xs text-muted">
                          {when(x.createdAt)}
                          {device(x.ua) && `، ${device(x.ua)}`}
                        </span>
                      </div>
                      <DeleteReportButton reportKey={x.key} />
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap items-center gap-3">
                  <ResolveButton recordingId={g.recordingId} count={g.reports.length} />
                  {r && (
                    <Link href={`/${r.category}/${encodeURIComponent(r.id)}`} target="_blank" className="min-h-11 px-2 py-2.5 text-sm text-gold-soft underline-offset-4 hover:underline">
                      صفحة التلاوة
                    </Link>
                  )}
                  <Link
                    href={`/admin/recordings?tab=all&q=${encodeURIComponent(g.recordingId.replace(/^yt-/, ""))}`}
                    className="min-h-11 px-2 py-2.5 text-sm text-gold-soft underline-offset-4 hover:underline"
                  >
                    عدّل العنوان أو القسم
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
