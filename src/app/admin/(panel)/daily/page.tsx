import { loadDaily, pickForDate } from "@/lib/admin/daily";
import { recordings } from "@/lib/api";
import { CATEGORIES } from "@/lib/categories";
import { addDays, hijriDayLabel, makkahToday } from "@/lib/imamate";
import { DailyAdd, DailyRemove, DailyUnpin } from "./controls";

export default async function AdminDailyPage() {
  const [doc, lists] = await Promise.all([loadDaily(), Promise.all(CATEGORIES.map((c) => recordings.list({ category: c.slug }).catch(() => [])))]);
  const byId = new Map(lists.flat().map((r) => [r.id, r]));
  const name = (id: string) => {
    const r = byId.get(id);
    return r ? [r.title || r.prayerLabel, r.subtitle].filter(Boolean).join(" · ") : `${id} (غير موجود حاليًا)`;
  };
  const pool = doc?.pool ?? [];
  const pinned = Object.entries(doc?.pinned ?? {}).sort(([a], [b]) => a.localeCompare(b));
  const today = makkahToday(new Date());
  // معاينة الأسبوع الجاي
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i)).map((d) => [d, doc?.pinned[d] ?? pickForDate(d, pool)] as const);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-4xl font-bold">تلاوة اليوم</h1>
        <p className="text-muted">اختر مجموعة تلاوات، ويعرض الموقع كل يوم واحدة منها في الرئيسية. ويمكنك تثبيت تلاوة على يوم معيّن.</p>
      </div>

      <DailyAdd />

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl font-bold text-gold-soft">الأيام السبعة القادمة</h2>
        {pool.length === 0 ? (
          <p className="text-muted">أضف تلاوات أولًا. ما دامت القائمة فارغة، لا يظهر «تلاوة اليوم» في الموقع.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {week.map(([d, id]) => (
              <li key={d} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line p-3 text-sm">
                <span className="font-semibold">{d === today ? "اليوم" : hijriDayLabel(d)}</span>
                <span className="text-muted">
                  {id ? name(id) : "—"} {doc?.pinned[d] && <span className="text-gold-soft">(مثبّتة)</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {pinned.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-2xl font-bold text-gold-soft">التلاوات المثبّتة</h2>
          <ul className="flex flex-col gap-2">
            {pinned.map(([d, id]) => (
              <li key={d} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line p-3 text-sm">
                <span>
                  <span className="font-semibold">{hijriDayLabel(d)}</span> · {name(id)}
                </span>
                <DailyUnpin date={d} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl font-bold text-gold-soft">القائمة ({pool.length})</h2>
        <ul className="flex flex-col gap-2">
          {pool.map((id) => (
            <li key={id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line p-3 text-sm">
              <span>{name(id)}</span>
              <DailyRemove id={id} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
