import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, cookieOptions, makeToken, readToken } from "@/lib/admin/session";

/**
 * كل طلب لصفحات اللوحة: لو الجلسة انتهت بنحوّل لصفحة الدخول،
 * ولو لسه شغالة بنمدّها ساعة كمان (طالما ما عدّتش ١٢ ساعة من الدخول).
 */
export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/admin/login")) return NextResponse.next();
  const session = await readToken(req.cookies.get(ADMIN_COOKIE)?.value);
  if (!session) {
    const url = new URL("/admin/login", req.url);
    if (req.cookies.get(ADMIN_COOKIE)) url.searchParams.set("expired", "1");
    const res = NextResponse.redirect(url);
    res.cookies.delete(ADMIN_COOKIE);
    return res;
  }
  const res = NextResponse.next();
  const token = await makeToken(session.issued);
  if (token) res.cookies.set(ADMIN_COOKIE, token, cookieOptions);
  return res;
}

export const config = { matcher: ["/admin/:path*"] };
