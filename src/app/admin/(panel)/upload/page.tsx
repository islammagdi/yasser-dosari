import { UploadForm } from "./UploadForm";

export const metadata = { title: "رفع تسجيل" };

export default function AdminUploadPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-4xl font-bold">رفع تسجيل</h1>
        <p className="leading-7 text-muted">
          اختار ملفات الصوت من جهازك، واكتب عنوان كل واحد زي ما بتكتبه على يوتيوب (مثلًا «صلاة العشاء ٢٨ جمادى الأولى ١٤٤٨»)
          عشان التاريخ والصلاة يتقروا منه. الملفات بتترفع على R2 مباشرة، فمفيش حد للحجم.
        </p>
      </div>
      <UploadForm />
    </div>
  );
}
