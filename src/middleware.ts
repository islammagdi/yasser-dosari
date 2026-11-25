import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, cookieOptions, makeToken, readToken } from "@/lib/admin/session";

/**
 * ١) اللغة: كل صفحات الموقع تحت app/[lang].
 *    - الروابط العربي زي ما هي (/fard) وبتتحوّل داخليًا لـ /ar/fard من غير ما الرابط يتغير.
 *    - الإنجليزي تحت /en/... ومش محتاج تحويل.
 *    - /ar/... بيتحوّل للرابط من غير /ar، عشان كل صفحة ليها رابط واحد.
 * ٢) اللوحة: لو الجلسة انتهت بنحوّل لصفحة الدخول، ولو لسه شغالة بنمدّها ساعة كمان (طالما ما عدّتش ١٢ ساعة من الدخول).
 */
/** اللغة اتنقلت لـ next.config.mjs (من غير CPU)، والـ middleware بقى للوحة التحكم بس */
export async function middleware(req: NextRequest) {
  return admin(req);
}

async function admin(req: NextRequest) {
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

/**
 * كل حاجة ما عدا: الـ API، وملفات Next، والملفات اللي ليها امتداد (صور، sw.js، robots.txt، ...)،
 * والتقويم (imamate.ics).
 */
export const config = {
  matcher: ["/admin/:path*"],
};
