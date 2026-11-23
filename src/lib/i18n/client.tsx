"use client";

import { createContext, useContext, useMemo } from "react";
import { makeL, type L, type Lang } from "./index";

const Ctx = createContext<Lang>("ar");

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <Ctx.Provider value={lang}>{children}</Ctx.Provider>;
}

/** أدوات اللغة في أي client component: const { t, toArabicDigits, href } = useL(); */
export function useL(): L {
  const lang = useContext(Ctx);
  return useMemo(() => makeL(lang), [lang]);
}

export const useLang = () => useContext(Ctx);
