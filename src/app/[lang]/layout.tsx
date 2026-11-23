import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/SiteShell";
import { isLang, LANGS, makeL } from "@/lib/i18n";
// رابط الموقع الأساسي: مهم عشان صور المشاركة على واتساب تبقى روابط كاملة
import { siteUrl } from "@/lib/site";
import "../globals.css";

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const lang = isLang(params.lang) ? params.lang : "ar";
  const { t } = makeL(lang);
  return {
    // مهم: من غيره صور المشاركة بتطلع على localhost
    metadataBase: new URL(siteUrl),
    // إثبات ملكية الموقع في Google Search Console
    verification: { google: "v3IbwRUUCDYnfZeFGobAaK9OaY84KwW2vUGszuFRF2E" },
    title: { default: t("الشيخ ياسر الدوسري"), template: `%s | ${t("الشيخ ياسر الدوسري")}` },
    description: t("تلاوات الشيخ ياسر الدوسري من المسجد الحرام أولًا بأول، والمصحف كاملًا بصوته، مع ورد يومي وجدول الإمامة."),
    applicationName: t("ياسر الدوسري"),
    appleWebApp: { capable: true, title: t("ياسر الدوسري"), statusBarStyle: "black-translucent" },
    manifest: lang === "en" ? "/manifest-en.webmanifest" : "/manifest.webmanifest",
    // صورة المشاركة الافتراضية (واتساب وغيره) لأي صفحة ملهاش صورة خاصة
    openGraph: {
      siteName: t("تلاوات الشيخ ياسر الدوسري"),
      locale: lang === "en" ? "en_US" : "ar_SA",
      type: "website",
      images: [{ url: "/og.jpg", width: 1200, height: 630, alt: t("الشيخ ياسر الدوسري، إمام وخطيب المسجد الحرام") }],
    },
    twitter: { card: "summary_large_image", images: ["/og.jpg"] },
  };
}

export const viewport: Viewport = {
  themeColor: "#F4EEE1",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function LangLayout({ children, params }: { children: React.ReactNode; params: { lang: string } }) {
  if (!isLang(params.lang)) notFound();
  return <SiteShell lang={params.lang}>{children}</SiteShell>;
}
