import { loadCatalog } from "@/lib/admin/catalog";
import { clipFileUrl, loadAllClips } from "@/lib/clips";
import { ClipForm } from "./ClipForms";
import { ClipsTable } from "./ClipsTable";

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
            مقاطع قصيرة بتتقلّب زي الريلز. ارفع فيديو طولي (mp4)، واكتب عنوانه. ولو المقطع من مصدر تاني، حط رابطه الأصلي عشان حقوق المصدر. الفيديو بيترفع على R2 مباشرة،
            وصورته المصغّرة بتتعمل لوحدها.
          </p>
        </div>
        <ClipForm recordings={recordings} />
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="clips-list-title">
        <h2 id="clips-list-title" className="font-display text-3xl font-bold">
          المقاطع {clips.length > 0 && <span className="text-xl text-muted">({clips.length})</span>}
        </h2>
        <ClipsTable
          clips={clips.map((c) => ({ ...c, posterUrl: clipFileUrl(c.posterKey), videoUrl: clipFileUrl(c.videoKey) }))}
          recordings={recordings}
        />
      </section>
    </div>
  );
}
