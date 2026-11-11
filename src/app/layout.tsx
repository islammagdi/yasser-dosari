import type { Metadata, Viewport } from "next";
import { InstallPrompt } from "@/components/InstallPrompt";
import { PlayerBar } from "@/components/PlayerBar";
import { PlayerProvider } from "@/components/PlayerProvider";
import { RegisterSW } from "@/components/RegisterSW";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

// رابط الموقع الأساسي: مهم عشان صور المشاركة على واتساب تبقى روابط كاملة
import { siteUrl } from "@/lib/site";
import { Amiri, Amiri_Quran, Aref_Ruqaa, IBM_Plex_Sans_Arabic } from "next/font/google";

// الخطوط بتتحمّل من موقعنا نفسه (next/font) بدل Google Fonts: مبتعطلش ظهور الصفحة، والنص بيظهر على طول
const amiri = Amiri({ subsets: ["arabic"], weight: ["400", "700"], display: "swap", variable: "--font-amiri" });
const plex = IBM_Plex_Sans_Arabic({ subsets: ["arabic"], weight: ["400", "500", "600"], display: "swap", variable: "--font-plex" });
// خطوط صفحات معيّنة: بتتحمّل بس في الصفحات اللي بتستخدمها
const amiriQuran = Amiri_Quran({ subsets: ["arabic"], weight: "400", display: "swap", variable: "--font-amiri-quran", preload: false });
const ruqaa = Aref_Ruqaa({ subsets: ["arabic"], weight: "700", display: "swap", variable: "--font-ruqaa", preload: false });
export const metadata: Metadata = {
  // مهم: من غيره صور المشاركة بتطلع على localhost
     metadataBase: new URL(siteUrl),
     // إثبات ملكية الموقع في Google Search Console
     verification: { google: "v3IbwRUUCDYnfZeFGobAaK9OaY84KwW2vUGszuFRF2E" },
  title: { default: "الشيخ ياسر الدوسري", template: "%s | الشيخ ياسر الدوسري" },
  description: "تلاوات الشيخ ياسر الدوسري من المسجد الحرام أولًا بأول، والمصحف كاملًا بصوته، مع ورد يومي وجدول الإمامة.",
  applicationName: "ياسر الدوسري",
  appleWebApp: { capable: true, title: "ياسر الدوسري", statusBarStyle: "black-translucent" },
  // صورة المشاركة الافتراضية (واتساب وغيره) لأي صفحة ملهاش صورة خاصة
  openGraph: {
    siteName: "تلاوات الشيخ ياسر الدوسري",
    locale: "ar_SA",
    type: "website",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "الشيخ ياسر الدوسري، إمام وخطيب المسجد الحرام" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.jpg"] },
};

export const viewport: Viewport = {
  themeColor: "#0F1714",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${amiri.variable} ${plex.variable} ${amiriQuran.variable} ${ruqaa.variable}`}>
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
          <InstallPrompt />
        </PlayerProvider>
      </body>
    </html>
  );
}
