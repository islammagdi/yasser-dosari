import { recordings } from "@/lib/api";
import { CATEGORIES } from "@/lib/categories";
import { countSubscriptions } from "@/lib/push/server";
import { NotifyForm } from "./NotifyForm";

// الإرسال لكل المشتركين ممكن ياخد وقت
export const maxDuration = 60;

export default async function AdminNotifyPage({ searchParams }: { searchParams: { id?: string; title?: string; body?: string; url?: string } }) {
  const count = await countSubscriptions().catch(() => 0);
  // جاي من "أرسل إشعارًا عنه": نملا البيانات من التسجيل
  let preset = { title: searchParams.title ?? "تلاوة جديدة", body: searchParams.body ?? "", url: searchParams.url ?? "/" };
  if (searchParams.id) {
    const lists = await Promise.all(CATEGORIES.map((c) => recordings.list({ category: c.slug }).catch(() => [])));
    const r = lists.flat().find((x) => x.id === searchParams.id);
    if (r) {
      const cat = CATEGORIES.find((c) => c.slug === r.category)?.title ?? "";
      preset = {
        title: `تلاوة جديدة في ${cat}`,
        body: [r.title || r.prayerLabel, r.subtitle].filter(Boolean).join(" · "),
        url: `/${r.category}/${r.id}`,
      };
    }
  }
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-4xl font-bold">الإشعارات</h1>
        <p className="text-muted">
          إرسال إشعار لكل من فعّل الإشعارات على جهازه. عدد المشتركين الآن: <span className="font-semibold text-gold-soft">{count}</span>
        </p>
      </div>
      <NotifyForm preset={preset} />
      <p className="text-sm leading-7 text-muted">
        نصيحة: لا تُكثر من الإشعارات. إشعار واحد في اليوم كحد أقصى يبقي الناس مشتركين، والإكثار يجعلهم يوقفونها.
      </p>
    </div>
  );
}
