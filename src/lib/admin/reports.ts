import { deleteKey, getFresh, listKeys, putJson } from "./r2";
import type { ReportReason } from "@/lib/reportReasons";

/**
 * بلاغات الزوار عن التلاوات، على R2.
 * كل بلاغ في ملف لوحده: admin/reports/<التلاوة>/<الوقت>-<عشوائي>.json
 * علشان لو اتنين بلّغوا في نفس اللحظة، محدش يمسح بلاغ التاني (مفيش ملف واحد بيتقري ويتكتب).
 */
export const REPORTS_PREFIX = "admin/reports/";

/** أقصى عدد بلاغات على التلاوة الواحدة في ٢٤ ساعة، وأقصى عدد مستني على التلاوة كلها */
const DAILY_LIMIT = 20;
const TOTAL_LIMIT = 100;
const DAY = 24 * 60 * 60 * 1000;

export interface Report {
  key: string;
  recordingId: string;
  category: string;
  reason: ReportReason;
  note?: string;
  /** الثانية اللي الزائر كان واقف عندها في التشغيل */
  at?: number;
  /** نوع الجهاز والمتصفح */
  ua?: string;
  createdAt: string;
}

const folder = (recordingId: string) => `${REPORTS_PREFIX}${encodeURIComponent(recordingId)}/`;

/** وقت البلاغ من اسم الملف نفسه، من غير ما نفتحه */
const timeOf = (key: string) => Number(key.slice(key.lastIndexOf("/") + 1).split("-")[0]) || 0;

export async function saveReport(input: Omit<Report, "key" | "createdAt">): Promise<"ok" | "limit"> {
  const existing = await listKeys(folder(input.recordingId));
  const now = Date.now();
  if (existing.length >= TOTAL_LIMIT || existing.filter((k) => now - timeOf(k) < DAY).length >= DAILY_LIMIT) return "limit";

  const key = `${folder(input.recordingId)}${now}-${Math.random().toString(36).slice(2, 8)}.json`;
  const report: Report = { ...input, key, createdAt: new Date(now).toISOString() };
  await putJson(key, report);
  return "ok";
}

export async function countReports(): Promise<number> {
  try {
    return (await listKeys(REPORTS_PREFIX)).length;
  } catch {
    return 0;
  }
}

export interface ReportGroup {
  recordingId: string;
  category: string;
  reports: Report[];
  /** آخر بلاغ: الترتيب بيبقى بالأحدث */
  latest: number;
}

/** كل البلاغات متجمّعة حسب التلاوة، والأحدث الأول. بنفتح آخر ٣٠٠ بلاغ بس */
export async function loadReportGroups(): Promise<ReportGroup[]> {
  const keys = (await listKeys(REPORTS_PREFIX)).sort((a, b) => timeOf(b) - timeOf(a)).slice(0, 300);
  const reports = (await Promise.all(keys.map((k) => getFresh<Report>(k).catch(() => null)))).filter((r): r is Report => !!r);

  const groups = new Map<string, ReportGroup>();
  for (const r of reports) {
    const g = groups.get(r.recordingId) ?? { recordingId: r.recordingId, category: r.category, reports: [], latest: 0 };
    g.reports.push(r);
    g.latest = Math.max(g.latest, timeOf(r.key));
    groups.set(r.recordingId, g);
  }
  return [...groups.values()].sort((a, b) => b.latest - a.latest);
}

export async function deleteReport(key: string): Promise<void> {
  // اللوحة بس بتمسح، ومن جوه فولدر البلاغات بس
  if (!key.startsWith(REPORTS_PREFIX)) throw new Error("مفتاح غير صالح");
  await deleteKey(key);
}

export async function deleteReportsFor(recordingId: string): Promise<number> {
  const keys = await listKeys(folder(recordingId));
  await Promise.all(keys.map((k) => deleteKey(k)));
  return keys.length;
}
