import { createHash, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { deleteKey, getFresh, putJson } from "./r2";
import { ADMIN_COOKIE, readToken } from "./session";

export { ADMIN_COOKIE } from "./session";

/** الدخول للوحة: الكوكي سليم ولسه ما انتهاش (ساعة من غير نشاط، أو ١٢ ساعة من الدخول) */
export async function isAdmin(): Promise<boolean> {
  return !!(await readToken(cookies().get(ADMIN_COOKIE)?.value));
}

export async function assertAdmin() {
  if (!(await isAdmin())) throw new Error("انتهت الجلسة. سجّل الدخول مرة أخرى.");
}

export function passwordMatches(input: string): boolean {
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass || pass.length < 12) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(pass);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ---------- القفل بعد محاولات غلط ----------
// كل جهاز (بالـ IP) ليه عدّاد على R2: ٥ محاولات غلط = قفل ربع ساعة.

export const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

interface Attempts {
  count: number;
  /** القفل بينتهي إمتى (ms) */
  until?: number;
}

function lockKey(): string {
  const ip = headers().get("x-forwarded-for")?.split(",")[0]?.trim() || headers().get("x-real-ip") || "unknown";
  return `admin/locks/${createHash("sha256").update(ip).digest("hex").slice(0, 32)}.json`;
}

/** لو الجهاز مقفول: باقي كام دقيقة، وإلا null */
export async function lockedMinutes(): Promise<number | null> {
  const a = await getFresh<Attempts>(lockKey()).catch(() => null);
  if (!a?.until || a.until <= Date.now()) return null;
  return Math.ceil((a.until - Date.now()) / 60000);
}

/** بيسجّل محاولة غلط، وبيرجّع المحاولات الباقية (٠ = اتقفل دلوقتي) */
export async function recordFailure(): Promise<number> {
  const key = lockKey();
  const prev = await getFresh<Attempts>(key).catch(() => null);
  // قفل قديم خلص: نبدأ العدّ من الأول
  const count = (prev?.until && prev.until <= Date.now() ? 0 : prev?.count ?? 0) + 1;
  const locked = count >= MAX_ATTEMPTS;
  await putJson(key, { count: locked ? 0 : count, until: locked ? Date.now() + LOCK_MS : undefined } satisfies Attempts).catch(() => {});
  return locked ? 0 : MAX_ATTEMPTS - count;
}

export async function clearFailures() {
  await deleteKey(lockKey()).catch(() => {});
}
