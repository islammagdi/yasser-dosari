import { Amiri, Amiri_Quran, Aref_Ruqaa, IBM_Plex_Sans_Arabic } from "next/font/google";
import { InstallPrompt } from "@/components/InstallPrompt";
import { NotificationsBanner } from "@/components/NotificationsBanner";
import { PlayerBar } from "@/components/PlayerBar";
import { MobileTabBar } from "@/components/MobileTabBar";
import { PlayerProvider } from "@/components/PlayerProvider";
import { RegisterSW } from "@/components/RegisterSW";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { themeInitScript } from "@/components/ThemeToggle";
import { AdminShortcut } from "@/components/AdminShortcut";
import { Analytics } from "@/components/Analytics";
import { LangProvider } from "@/lib/i18n/client";
import { dirOf, makeL, type Lang } from "@/lib/i18n";

// الخطوط بتتحمّل من موقعنا نفسه (next/font) بدل Google Fonts: مبتعطلش ظهور الصفحة، والنص بيظهر على طول
// latin عشان النسخة الإنجليزي (IBM Plex و Amiri فيهم حروف لاتيني بنفس الروح)
const amiri = Amiri({ subsets: ["arabic", "latin"], weight: ["400", "700"], display: "swap", variable: "--font-amiri" });
const plex = IBM_Plex_Sans_Arabic({ subsets: ["arabic", "latin"], weight: ["400", "500", "600"], display: "swap", variable: "--font-plex" });
// خطوط صفحات معيّنة: بتتحمّل بس في الصفحات اللي بتستخدمها
const amiriQuran = Amiri_Quran({ subsets: ["arabic"], weight: "400", display: "swap", variable: "--font-amiri-quran", preload: false });
const ruqaa = Aref_Ruqaa({ subsets: ["arabic"], weight: "700", display: "swap", variable: "--font-ruqaa", preload: false });

/**
 * هيكل الصفحة كله (html و body والهيدر والمشغّل والفوتر).
 * بيستخدمه app/[lang]/layout.tsx (الموقع بالعربي والإنجليزي) و app/admin/layout.tsx (اللوحة، عربي دايمًا).
 */
export function SiteShell({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const { t } = makeL(lang);
  return (
    <html lang={lang} dir={dirOf(lang)} suppressHydrationWarning className={`${amiri.variable} ${plex.variable} ${amiriQuran.variable} ${ruqaa.variable}`}>
      {/* eslint-disable-next-line @next/next/no-head-element -- ده الـ root layout (app router)، مش pages */}
      <head>
        {/* لازم يشتغل قبل أول رسم، عشان اللي اختار الغامق ميشوفش وميض فاتح */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <LangProvider lang={lang}>
          <div aria-hidden className="ambient" />
          <RegisterSW />
          <Analytics />
          <PlayerProvider>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-30 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-ink"
            >
              {t("تخطَّ إلى المحتوى")}
            </a>
            <SiteHeader />
            <main id="main" className="mx-auto w-full max-w-page px-4 pb-[calc(8rem+var(--tabbar))] pt-6 sm:px-6 sm:pt-10">
              <NotificationsBanner />
              {children}
            </main>
            <SiteFooter lang={lang} />
            <AdminShortcut />
            <PlayerBar />
            <MobileTabBar />
            <InstallPrompt />
          </PlayerProvider>
        </LangProvider>
      </body>
    </html>
  );
}
