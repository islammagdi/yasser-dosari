/** أسباب «بلّغ عن مشكلة». الملف ده من غير أي كود سيرفر، عشان صفحة التلاوة واللوحة يستخدموه الاتنين */
export const REPORT_REASONS = [
  { value: "audio", label: "الصوت مش شغال أو بيقطع" },
  { value: "quality", label: "الصوت فيه تشويش أو ضعيف" },
  { value: "info", label: "العنوان أو التاريخ غلط" },
  { value: "category", label: "التلاوة في قسم غلط" },
  { value: "duplicate", label: "التلاوة مكررة" },
  { value: "other", label: "حاجة تانية" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

export const reasonLabel = (v: string) => REPORT_REASONS.find((r) => r.value === v)?.label ?? v;

export const isReason = (v: unknown): v is ReportReason => REPORT_REASONS.some((r) => r.value === v);

/** أقصى طول للتفاصيل اللي الزائر بيكتبها */
export const NOTE_MAX = 300;
