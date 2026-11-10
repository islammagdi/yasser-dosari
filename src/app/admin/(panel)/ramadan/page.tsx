import { loadImamateDoc } from "@/lib/admin/imamateStore";
import { imamateFallback } from "@/lib/api/mock";
import { RamadanEditor } from "./RamadanEditor";

export default async function AdminRamadanPage() {
  const doc = await loadImamateDoc();
  const nights = doc ? doc.ramadan : (await imamateFallback()).nights;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-4xl font-bold">جدول رمضان</h1>
        <p className="text-muted">علّم الأجزاء التي يؤمها الشيخ في كل ليلة. «ليلة ١١» هي مساء يوم ١٠ رمضان.</p>
      </div>
      {!doc && (
        <p className="rounded-2xl border border-gold/40 bg-gold/5 p-4 text-sm leading-7">
          هذه الليالي منقولة من Google Sheet. راجعها، ثم اضغط «حفظ» لنقلها إلى لوحة التحكم.
        </p>
      )}
      <RamadanEditor initial={nights} />
    </div>
  );
}
