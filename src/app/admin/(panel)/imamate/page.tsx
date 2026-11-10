import { loadImamateDoc } from "@/lib/admin/imamateStore";
import { imamateFallback } from "@/lib/api/mock";
import { WeeksEditor } from "./WeeksEditor";

export default async function AdminImamatePage() {
  const doc = await loadImamateDoc();
  const weeks = doc ? doc.weeks : (await imamateFallback()).weeks;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-4xl font-bold">جدول الإمامة</h1>
        <p className="text-muted">كل أسبوع يبدأ يوم الأحد، والصلوات التي يؤمها الشيخ طوال الأسبوع كما في إعلان رئاسة الشؤون الدينية.</p>
      </div>
      {!doc && (
        <p className="rounded-2xl border border-gold/40 bg-gold/5 p-4 text-sm leading-7">
          هذه الأسابيع منقولة من Google Sheet. راجعها، ثم اضغط «حفظ» لنقلها إلى لوحة التحكم. بعد الحفظ، الموقع سيقرأ من هنا بدل الشيت.
        </p>
      )}
      <WeeksEditor initial={weeks} />
    </div>
  );
}
