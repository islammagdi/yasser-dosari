import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, cookieOptions, makeToken, readToken } from "@/lib/admin/session";

/**
 * ١) اللغة: كل صفحات الموقع تحت app/[lang].
 *    - الروابط العربي زي ما هي (/fard) وبتتحوّل داخليًا لـ /ar/fard من غير ما الرابط يتغير.
 *    - الإنجليزي تحت /en/... ومش محتاج تحويل.
 *    - /ar/... بيتحوّل للرابط من غير /ar، عشان كل صفحة ليها رابط واحد.
 * ٢) اللوحة: لو الجلسة انتهت بنحوّل لصفحة الدخول، ولو لسه شغالة بنمدّها ساعة كمان (طالما ما عدّتش ١٢ ساعة من الدخول).
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin")) return admin(req);

  if (pathname === "/en" || pathname.startsWith("/en/")) return NextResponse.next();
  // صور المشاركة المولّدة: Next بيكتب رابطها بالمسار الداخلي (/ar/...)، فبتعدّي زي ما هي
  if (pathname.startsWith("/ar/") && pathname.endsWith("/opengraph-image")) return NextResponse.next();
  if (pathname === "/ar" || pathname.startsWith("/ar/")) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    return NextResponse.redirect(url, 308);
  }
  const url = req.nextUrl.clone();
  url.pathname = `/ar${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
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
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
