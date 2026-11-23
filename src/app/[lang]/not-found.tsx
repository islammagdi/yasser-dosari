"use client";

import Link from "@/lib/i18n/nav";
import { useL } from "@/lib/i18n/client";

export default function NotFound() {
  const { t } = useL();
  return (
    <div className="flex flex-col items-start gap-4 py-16">
      <h1 className="font-display text-4xl font-bold">{t("الصفحة غير موجودة")}</h1>
      <p className="text-muted">{t("ربما تغيّر الرابط. ارجع إلى الصفحة الرئيسية واختر القسم من هناك.")}</p>
      <Link href="/" className="flex min-h-11 items-center rounded-full bg-accent px-6 font-semibold text-accent-ink hover:bg-accent-hover">
        {t("العودة إلى الرئيسية")}
      </Link>
    </div>
  );
}
