import type { Metadata, Viewport } from "next";
import { PlayerBar } from "@/components/PlayerBar";
import { PlayerProvider } from "@/components/PlayerProvider";
import { RegisterSW } from "@/components/RegisterSW";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

// رابط الموقع الأساسي: مهم عشان صور المشاركة على واتساب تبقى روابط كاملة
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  // مهم: من غيره صور المشاركة بتطلع على localhost
  metadataBase: new URL(siteUrl),
  title: { default: "الشيخ ياسر الدوسري", template: "%s | الشيخ ياسر الدوسري" },
  description: "محاضرات الشيخ ياسر الدوسري وتلاوات الصلوات المفروضة وصلاة التراويح.",
  applicationName: "ياسر الدوسري",
  appleWebApp: { capable: true, title: "ياسر الدوسري", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0F1714",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Amiri+Quran&family=Aref+Ruqaa:wght@700&family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap"
        />
      </head>
      <body>
        <div aria-hidden className="ambient" />
        <RegisterSW />
        <PlayerProvider>
          <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:right-4 focus:top-4 focus:z-30 focus:rounded-lg focus:bg-gold focus:px-4 focus:py-2 focus:text-gold-ink">
            تخطَّ إلى المحتوى
          </a>
          <SiteHeader />
<main id="main" className="mx-auto w-full max-w-page px-4 pb-32 pt-6 sm:px-6 sm:pt-10">
            {children}
          </main>
          <SiteFooter />
          <PlayerBar />
        </PlayerProvider>
      </body>
    </html>
  );
}
