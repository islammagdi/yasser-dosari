import Link from "@/lib/i18n/nav";
import { makeL, type Lang } from "@/lib/i18n";
import { LangSwitch, TranslateIcon } from "./LangSwitch";
import { Logo } from "./Logo";
import { NotificationsButton } from "./NotificationsButton";
import { FEEDBACK_URL, feedbackHref } from "@/lib/site";

/**
 * الفوتر: كل حاجة في النص (زي مواقع التلاوات الكلاسيكية): اسم الشيخ المخطوط كبير،
 * وتحته اللقب، واللينكات في سطر واحد بخط تحتها، وفي الآخر سطر التنويه.
 */
const link = "flex min-h-11 items-center underline decoration-fg/25 decoration-1 underline-offset-[10px] transition-colors hover:text-text hover:decoration-gold";

export function SiteFooter({ lang }: { lang: Lang }) {
  const { t } = makeL(lang);
  return (
    <footer className="border-t border-fg/10">
      <div className="mx-auto flex max-w-page flex-col items-center gap-6 px-4 pb-[calc(8rem+var(--tabbar))] pt-16 text-center sm:px-6">
        <Link href="/" aria-label={t("الرئيسية")}>
          <Logo label={t("الشيخ ياسر الدوسري")} className="block h-16 w-64 sm:h-20 sm:w-80" />
        </Link>
        <p className="font-display text-xl text-gold-soft sm:text-2xl">{t("إمام وخطيب المسجد الحرام")}</p>

        <nav aria-label={t("روابط الموقع")} className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-[15px] text-text/80">
          <Link href="/about" className={link}>
            {t("عن الموقع")}
          </Link>
          <Link href="/about#sources" className={link}>
            {t("المصادر")}
          </Link>
          <NotificationsButton label={t("الإشعارات")} sheet up align="start" className={`${link} gap-1.5`} />
          <Link href="/transfer" className={link}>
            {t("نقل بياناتي")}
          </Link>
          <Link href="/about#privacy" className={link}>
            {t("سياسة الخصوصية")}
          </Link>
          <a href={feedbackHref} {...(FEEDBACK_URL ? { target: "_blank", rel: "noopener noreferrer" } : {})} className={`${link} font-semibold text-gold-soft`}>
            {t("اقترح تحسينًا")}
          </a>
          <LangSwitch className={`${link} gap-1.5`}>
            <TranslateIcon className="h-4 w-4" />
          </LangSwitch>
        </nav>

        <p className="max-w-xl text-sm leading-7 text-muted">{t("موقع تطوعي غير رسمي، لا يتبع الشيخ ولا أي جهة رسمية. وهدفه هو تجميع تلاوات الشيخ في مكان واحد وليس الربح.")}</p>
      </div>
    </footer>
  );
}
