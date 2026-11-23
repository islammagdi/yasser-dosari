/**
 * لغات الموقع. العربي هو الأساسي وروابطه زي ما هي (/fard)، والإنجليزي تحت /en (/en/fard).
 * الـ middleware بيحوّل الروابط العربي داخليًا لـ /ar/... عشان الصفحات كلها تحت app/[lang].
 */
export const LANGS = ["ar", "en"] as const;
export type Lang = (typeof LANGS)[number];

export const isLang = (v: unknown): v is Lang => v === "ar" || v === "en";
export const dirOf = (lang: Lang) => (lang === "ar" ? "rtl" : "ltr");

/** "/fard" ← "/en/fard" في الإنجليزي. الروابط الخارجية والـ # بترجع زي ما هي */
export function localizeHref(href: string, lang: Lang): string {
  if (lang === "ar" || !href.startsWith("/") || href.startsWith("//")) return href;
  if (href === "/en" || href.startsWith("/en/") || href.startsWith("/en?") || href.startsWith("/en#")) return href;
  if (/^\/(api|admin|_next)(\/|$)/.test(href) || /\.(ics|xml|txt|webmanifest|png|jpg|svg|mp3|mp4)(\?|$)/.test(href)) return href;
  if (href === "/") return "/en";
  if (href.startsWith("/?") || href.startsWith("/#")) return `/en${href.slice(1)}`;
  return `/en${href}`;
}

/**
 * "/en/fard" ← "/fard": المسار من غير بادئة اللغة.
 * و"/ar/fard" كمان: الصفحات العربي بتتبني تحت /ar (الـ middleware بيحوّل لها داخليًا)،
 * فوقت الـ SSR الـ pathname بيبقى "/ar/..." وفي المتصفح "/..."، ولازم الاتنين يدّوا نفس النتيجة.
 */
export function stripLang(pathname: string): string {
  if (pathname === "/en" || pathname === "/ar") return "/";
  if (pathname.startsWith("/en/") || pathname.startsWith("/ar/")) return pathname.slice(3);
  return pathname;
}

/** نفس الصفحة باللغة التانية (زرار تبديل اللغة) */
export function switchHref(pathname: string, search: string, to: Lang): string {
  const base = stripLang(pathname);
  return localizeHref(base, to) + (search ? (search.startsWith("?") ? search : `?${search}`) : "");
}
