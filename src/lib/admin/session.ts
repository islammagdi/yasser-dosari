/**
 * جلسة لوحة التحكم: الكوكي = "وقت الدخول.وقت الانتهاء.التوقيع".
 * - بتنتهي بعد ساعة من غير أي نشاط (كل طلب للوحة بيمدّها ساعة كمان).
 * - وبتنتهي في كل الأحوال بعد ١٢ ساعة من الدخول.
 * التوقيع بـ Web Crypto عشان يشتغل في الـ middleware والسيرفر الاتنين.
 */
export const ADMIN_COOKIE = "yd_admin";
export const IDLE_MS = 60 * 60 * 1000;
export const MAX_MS = 12 * 60 * 60 * 1000;

const enc = new TextEncoder();

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(`yd-admin-v2:${data}`)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
}

function secret(): string | null {
  const pass = process.env.ADMIN_PASSWORD;
  return pass && pass.length >= 12 ? pass : null; // باسورد قصير = اللوحة مقفولة خالص
}

/** توكن جديد: الانتهاء بعد ساعة، ومن غير ما يعدّي ١٢ ساعة من الدخول */
export async function makeToken(issued: number, now = Date.now()): Promise<string | null> {
  const s = secret();
  if (!s) return null;
  const exp = Math.min(now + IDLE_MS, issued + MAX_MS);
  const payload = `${issued}.${exp}`;
  return `${payload}.${await hmac(s, payload)}`;
}

/** بيرجّع وقت الدخول لو التوكن سليم ولسه ما انتهاش، وإلا null */
export async function readToken(value: string | undefined, now = Date.now()): Promise<{ issued: number } | null> {
  const s = secret();
  if (!s || !value) return null;
  const [issued, exp, sig] = value.split(".");
  if (!issued || !exp || !sig) return null;
  const expected = await hmac(s, `${issued}.${exp}`);
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0 || Number(exp) <= now) return null;
  return { issued: Number(issued) };
}

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_MS / 1000,
};
