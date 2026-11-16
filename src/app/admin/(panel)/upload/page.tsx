import { loadCatalog } from "@/lib/admin/catalog";
import { adminManifest } from "@/lib/admin/manifest";
import { CoverUpload } from "../CoverUpload";
import { UploadForm } from "./UploadForm";

export const metadata = { title: "رفع تسجيل" };

export default async function AdminUploadPage() {
  const [catalog, manifest] = await Promise.all([loadCatalog(), adminManifest()]);
  // التسجيلات الخاصة اللي لسه ملهاش غلاف: عشان لو نسيت الصورة وقت الرفع
  const noCover = Object.entries(manifest)
    .filter(([id, m]) => id.startsWith("custom-") && !m.image && !catalog?.items[id]?.hidden)
    .map(([id, m]) => ({ id, title: catalog?.items[id]?.title || m.title || id, uploadedAt: m.uploadedAt ?? "" }))
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-4xl font-bold">رفع تسجيل</h1>
          <p className="leading-7 text-muted">
            اختار ملفات الصوت من جهازك، واكتب لكل واحد العنوان والقسم، والوصف والتاريخ لو حابب. لو العنوان فيه التاريخ (مثلًا «صلاة العشاء ٢٨ جمادى
            الأولى ١٤٤٨») مش محتاج تكتبه تاني. الملفات بتترفع على R2 مباشرة، فمفيش حد للحجم.
          </p>
        </div>
        <UploadForm />
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="covers-title">
        <div className="flex flex-col gap-1">
          <h2 id="covers-title" className="font-display text-3xl font-bold">
            تسجيلات من غير غلاف {noCover.length > 0 && <span className="text-xl text-muted">({noCover.length})</span>}
          </h2>
          <p className="text-muted">لو نسيت الصورة وقت الرفع، اختارها من هنا. الصورة بتظهر على الموقع على طول.</p>
        </div>
        {noCover.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line-strong p-6 text-center text-muted">كل التسجيلات الخاصة ليها غلاف.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {noCover.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-raised p-4">
                <span className="min-w-0 flex-1 font-semibold">
                  {r.title}
                  {!catalog?.items[r.id] && <span className="ms-2 text-xs font-normal text-muted">(بانتظار التصنيف)</span>}
                </span>
                <CoverUpload id={r.id} hasCover={false} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
