import { loadCatalog } from "@/lib/admin/catalog";
import { clipFileUrl, loadAllClips } from "@/lib/clips";
import { ClipForm, ClipRow } from "./ClipForms";

export const metadata = { title: "مقتطفات" };

export default async function AdminClipsPage() {
  const [clips, catalog] = await Promise.all([loadAllClips(), loadCatalog()]);
  // التسجيلات اللي ممكن نربط بيها المقطع (أي قسم): للبحث بالعنوان في الفورم
  const recordings = Object.entries(catalog?.items ?? {})
    .filter(([, e]) => !e.hidden)
    .map(([id, e]) => ({ id, title: e.title || e.prayerLabel || id }));

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-4xl font-bold">مقتطفات</h1>
          <p className="leading-7 text-muted">
            مقاطع قصيرة بتتقلّب زي الريلز. ارفع فيديو طولي (mp4)، واكتب عنوانه ورابط المقطع الأصلي عشان حقوق المصدر. الفيديو بيترفع على R2 مباشرة،
            وصورته المصغّرة بتتعمل لوحدها.
          </p>
        </div>
        <ClipForm recordings={recordings} />
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="clips-list-title">
        <h2 id="clips-list-title" className="font-display text-3xl font-bold">
          المقاطع {clips.length > 0 && <span className="text-xl text-muted">({clips.length})</span>}
        </h2>
        {clips.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line-strong p-6 text-center text-muted">لسه مفيش مقاطع.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {clips.map((c) => (
              <ClipRow key={c.id} clip={c} poster={clipFileUrl(c.posterKey)} recordings={recordings} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
