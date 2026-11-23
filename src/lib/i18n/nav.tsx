"use client";

/**
 * بدائل next/link و next/navigation بتراعي اللغة:
 * - Link: بيضيف /en للروابط الداخلية في النسخة الإنجليزي.
 * - usePathname: بيرجّع المسار من غير /en، عشان مقارنات "القسم النشط" تفضل زي ما هي.
 * - useRouter: push/replace/prefetch بيضيفوا /en.
 */
import NextLink from "next/link";
import { usePathname as useNextPathname, useRouter as useNextRouter } from "next/navigation";
import { forwardRef, useMemo, type ComponentProps } from "react";
import { localizeHref, stripLang } from "./config";
import { useLang } from "./client";

type LinkProps = ComponentProps<typeof NextLink>;

const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link({ href, ...rest }, ref) {
  const lang = useLang();
  const h =
    typeof href === "string"
      ? localizeHref(href, lang)
      : href.pathname
        ? { ...href, pathname: localizeHref(href.pathname, lang) }
        : href;
  return <NextLink ref={ref} href={h} {...rest} />;
});
export default Link;

export function usePathname(): string {
  const p = useNextPathname() ?? "/";
  return stripLang(p);
}

export function useRouter() {
  const r = useNextRouter();
  const lang = useLang();
  return useMemo(
    () => ({
      ...r,
      push: (href: string, opts?: Parameters<typeof r.push>[1]) => r.push(localizeHref(href, lang), opts),
      replace: (href: string, opts?: Parameters<typeof r.replace>[1]) => r.replace(localizeHref(href, lang), opts),
      prefetch: (href: string) => r.prefetch(localizeHref(href, lang)),
    }),
    [r, lang],
  );
}

export { useSearchParams, notFound, redirect } from "next/navigation";
