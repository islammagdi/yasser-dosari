import type { Metadata } from "next";
import { isLang, localizeHref, makeL, type Lang } from "./index";

export type LangParams = { lang?: string };

/** لغة الصفحة من params (app/[lang]) */
export const langOf = (params?: LangParams): Lang => (isLang(params?.lang) ? params!.lang : "ar");

/** أدوات اللغة لصفحة سيرفر: const l = pageL(params) */
export const pageL = (params?: LangParams) => makeL(langOf(params));

/**
 * metadata بلغة الصفحة: العنوان والوصف بيتترجموا، ومعاهم روابط النسختين (hreflang) عشان جوجل.
 * path: المسار من غير /en، زي "/fard".
 */
export function pageMeta(params: LangParams | undefined, path: string, m: Metadata & { title?: string; description?: string }): Metadata {
  const lang = langOf(params);
  const { t } = makeL(lang);
  return {
    ...m,
    ...(m.title && { title: t(m.title) }),
    ...(m.description && { description: t(m.description) }),
    alternates: {
      ...m.alternates,
      canonical: localizeHref(path, lang),
      languages: { ar: path, en: localizeHref(path, "en"), "x-default": path },
    },
  };
}
