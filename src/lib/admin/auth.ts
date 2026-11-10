import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * دخول لوحة التحكم بباسورد واحد (ADMIN_PASSWORD).
 * الكوكي فيه بصمة من الباسورد مش الباسورد نفسه، ولو الباسورد اتغيّر كل الجلسات القديمة بتقفل.
 */
export const ADMIN_COOKIE = "yd_admin";

function sessionToken(): string | null {
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass || pass.length < 12) return null; // باسورد قصير = اللوحة مقفولة خالص
  return createHmac("sha256", pass).update("yd-admin-session-v1").digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function isAdmin(): boolean {
  const token = sessionToken();
  const got = cookies().get(ADMIN_COOKIE)?.value;
  return !!token && !!got && safeEqual(got, token);
}

/** بيرجّع البصمة لو الباسورد صح، وإلا null */
export function checkPassword(input: string): string | null {
  const pass = process.env.ADMIN_PASSWORD;
  const token = sessionToken();
  if (!pass || !token) return null;
  return safeEqual(input, pass) ? token : null;
}

export function assertAdmin() {
  if (!isAdmin()) throw new Error("غير مصرّح");
}
