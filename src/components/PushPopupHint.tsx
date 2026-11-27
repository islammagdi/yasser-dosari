"use client";

import { useL } from "@/lib/i18n/client";
import { useEffect, useState } from "react";
import { pushPlatform, testNotification } from "@/lib/push/client";

/**
 * بعد تفعيل الإشعارات: إزاي الإشعار يظهر كـ popup فوق الشاشة بدل أيقونة صغيرة بس.
 * الموقع مينفعش يفرض ده؛ الموبايل هو اللي بيقرر حسب إعداداته، فبنوضّح الخطوات
 * ونبعت إشعار تجربة يضغط عليه الزائر ضغطة طويلة ويغيّر الإعداد على طول.
 */
export function PushPopupHint({ compact = false }: { compact?: boolean }) {
  const { t } = useL();
  const [platform, setPlatform] = useState<"android" | "ios" | "other" | null>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => setPlatform(pushPlatform()), []);

  // الكمبيوتر: الإشعار بيظهر popup لوحده
  if (!platform || platform === "other") return null;

  const test = async () => {
    setError(false);
    try {
      await testNotification(t("تجربة إشعار"), t("اضغط على الإشعار ده ضغطة طويلة، وفعّل «الظهور على الشاشة»."));
      setSent(true);
    } catch {
      setError(true);
    }
  };

  return (
    <div className={`flex flex-col gap-2 rounded-xl border border-gold/25 bg-fg/[0.03] p-3 text-sm leading-6 ${compact ? "" : "mt-1"}`}>
      <p className="font-semibold text-gold-soft">{t("عشان الإشعار يظهر على الشاشة")}</p>
      {platform === "android" ? (
        <p className="text-muted">
          {t("اضغط ضغطة طويلة على أي إشعار من الموقع، ثم الإعدادات، وفعّل «الظهور على الشاشة» (Pop on screen) وخلّي الصوت شغال.")}
        </p>
      ) : (
        <p className="text-muted">{t("من إعدادات الآيفون: الإشعارات ← الموقع ← نوع اللافتة، واختار «دائم».")}</p>
      )}
      {platform === "android" && (
        <button
          type="button"
          onClick={test}
          className="min-h-10 self-start rounded-full border border-gold/40 px-4 font-semibold text-text hover:bg-fg/5"
        >
          {sent ? t("اتبعت، شوف الإشعارات فوق") : t("ابعت إشعار تجربة")}
        </button>
      )}
      {error && <p className="text-[#E5636B]">{t("تعذّر إرسال إشعار التجربة.")}</p>}
    </div>
  );
}
