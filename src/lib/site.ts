/**
 * رابط الموقع الأساسي، من غير / في الآخر.
 * بيستخدمه الـ layout (صور المشاركة) والـ sitemap والـ robots، فلازم يبقى مصدر واحد.
 */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
).replace(/\/$/, "");

/**
 * رابط البث المباشر من المسجد الحرام، بيظهر في الهيرو وقت إمامة الشيخ.
 * حط هنا الرابط الرسمي اللي اخترته؛ لو فاضي، الزرار مش بيظهر.
 */
export const MAKKAH_LIVE_URL = "";

/** بريد التواصل: بيظهر في صفحة "عن الموقع"، وبيتستخدم للاقتراحات لو مفيش نموذج */
export const CONTACT_EMAIL = "imagdi.swe@gmail.com";

/**
 * رابط نموذج الاقتراحات (Google Form مثلًا). لو فاضي، زرار "اقترح تحسينًا" بيفتح إيميل جاهز بعنوان.
 */
export const FEEDBACK_URL = "https://forms.gle/LhuNCer8U3yyCmcV9";

export const feedbackHref =
  FEEDBACK_URL ||
  `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("اقتراح لموقع تلاوات الشيخ ياسر الدوسري")}`;