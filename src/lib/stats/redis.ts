/**
 * الإحصائيات بتتخزن في Upstash Redis (مجاني، بيتربط من Vercel → Storage → Upstash).
 * بنكلمه بـ REST على طول من غير مكتبة، عشان يشتغل في الـ Edge والسيرفر.
 * المتغيرات: UPSTASH_REDIS_REST_URL و UPSTASH_REDIS_REST_TOKEN
 * (أو KV_REST_API_URL و KV_REST_API_TOKEN، الأسماء اللي Vercel بيحطها لوحده لما تربطه من Marketplace).
 */
const base = (process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? "").replace(/\/$/, "");
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? "";

export const statsEnabled = () => Boolean(base && token);

export type Cmd = (string | number)[];

/** أوامر كتير في طلب واحد. بيرجّع نتيجة كل أمر بالترتيب (أو null لو فشل) */
export async function pipeline(cmds: Cmd[]): Promise<unknown[]> {
  if (!statsEnabled() || cmds.length === 0) return [];
  const res = await fetch(`${base}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmds.map((c) => c.map(String))),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis ${res.status}: ${await res.text()}`);
  const out = (await res.json()) as { result?: unknown; error?: string }[];
  return out.map((r) => (r.error ? null : r.result ?? null));
}

/** اليوم بتوقيت مكة: "2026-11-23" (جمهور الموقع أغلبه في الخليج ومصر) */
export function dayKey(d = new Date()): string {
  return new Date(d.getTime() + 3 * 3600_000).toISOString().slice(0, 10);
}

/** آخر n يوم، الأقدم الأول */
export function lastDays(n: number, now = new Date()): string[] {
  return Array.from({ length: n }, (_, i) => dayKey(new Date(now.getTime() - (n - 1 - i) * 86_400_000)));
}

/** مفاتيح الأيام بتتمسح لوحدها بعد ~١٣ شهر */
export const DAY_TTL = 400 * 86_400;

export const K = {
  pv: (d: string) => `st:pv:${d}`, // عدد الصفحات
  uv: (d: string) => `st:uv:${d}`, // الزوار (HyperLogLog)
  pages: (d: string) => `st:pages:${d}`,
  plays: (d: string) => `st:plays:${d}`, // تشغيل كل تسجيل
  clips: (d: string) => `st:clips:${d}`, // مشاهدة كل مقطع
  ev: (d: string) => `st:ev:${d}`, // أحداث (مشاركة، تحميل، ...)
  ctry: (d: string) => `st:ctry:${d}`,
  ref: (d: string) => `st:ref:${d}`,
  dev: (d: string) => `st:dev:${d}`,
  lang: (d: string) => `st:lang:${d}`,
  /** متواجدين دلوقتي: الزائر ووقت آخر نشاط */
  live: "st:live",
  /** عنوان كل صفحة وكل تسجيل/مقطع، عشان اللوحة تعرض أسماء مش روابط */
  titles: "st:titles",
};
