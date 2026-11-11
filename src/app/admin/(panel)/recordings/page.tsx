import Link from "next/link";
import { loadCatalog } from "@/lib/admin/catalog";
import { adminManifest } from "@/lib/admin/manifest";
import { fetchYoutubeMushaf } from "@/lib/api/youtube";
import { normalizeArabic } from "@/lib/format";
import { EntryRow, PendingRow, RefreshManifestButton, SyncButton } from "./rows";

// جلب البلاي ليستات من يوتيوب (زرار الإنشاء) ممكن ياخد وقت
export const maxDuration = 60;

const PAGE_SIZE = 30;
const SECTIONS = [
  { value: "", label: "كل الأقسام" },
  { value: "fard", label: "الفروض" },
  { value: "taraweeh", label: "التراويح" },
  { value: "lectures", label: "الخطب والمحاضرات" },
  { value: "rare", label: "تلاوات نادرة" },
  { value: "hidden", label: "المخفية" },
];

interface Props {
  searchParams: { tab?: string; q?: string; cat?: string; page?: string };
}

export default async function AdminRecordingsPage({ searchParams }: Props) {
  const [catalog, manifest, mushaf] = await Promise.all([loadCatalog(), adminManifest(), fetchYoutubeMushaf().catch(() => [])]);
  const items = catalog?.items ?? {};
  // فيديوهات المصحف (المركز السعودي) ليها مكانها في قسم المصحف، فمش محتاجة تصنيف
  const mushafIds = new Set(mushaf.map((r) => r.id.replace(/^yt-mushaf-/, "")));
  const pending = Object.entries(manifest).filter(([id]) => !items[id] && !mushafIds.has(id));
  const tab = searchParams.tab === "all" ? "all" : "pending";

  const tabLink = (t: string, label: string) => (
    <Link
      href={`/admin/recordings?tab=${t}`}
      className={`min-h-11 rounded-full px-5 py-2.5 text-sm font-semibold ${tab === t ? "bg-accent text-accent-ink" : "border border-line-strong text-muted hover:text-text"}`}
    >
      {label}
    </Link>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-4xl font-bold">التسجيلات</h1>
        <p className="text-muted">الموقع يعرض التسجيلات الموجودة في الكتالوج فقط، كلٌّ في قسمه.</p>
      </div>

      {!catalog && (
        <section className="flex flex-col gap-3 rounded-2xl border border-gold/40 bg-gold/5 p-5">
          <p className="leading-7">
            الكتالوج لم يُنشأ بعد، والموقع ما زال يعرض التسجيلات من بلاي ليستات يوتيوب. اضغط الزر لإنشاء الكتالوج من التقسيم الحالي، وكل التسجيلات الظاهرة الآن ستبقى في أقسامها.
          </p>
          <SyncButton label="إنشاء الكتالوج من البلاي ليستات" />
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {tabLink("pending", `بانتظار التصنيف (${pending.length})`)}
        {tabLink("all", `كل التسجيلات (${Object.keys(items).length})`)}
      </div>

      {tab === "pending" ? (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
            <span>التسجيلات المرفوعة على R2 وليست في الكتالوج بعد. لا تظهر للزوار حتى تصنّفها.</span>
            <RefreshManifestButton />
          </div>
          {pending.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line-strong p-8 text-center text-muted">لا توجد تسجيلات جديدة.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {pending.map(([id, meta]) => (
                <PendingRow key={id} id={id} title={meta.title} duration={meta.duration} />
              ))}
            </ul>
          )}
        </section>
      ) : (
        <AllTab items={items} searchParams={searchParams} />
      )}

      {catalog && (
        <details className="text-sm text-muted">
          <summary className="cursor-pointer">أدوات</summary>
          <div className="mt-3 flex flex-col gap-2">
            <p>إضافة أي فيديو موجود في بلاي ليستات القناة وغير موجود في الكتالوج (لا يغيّر التسجيلات الموجودة).</p>
            <SyncButton label="إضافة الناقص من البلاي ليستات" />
          </div>
        </details>
      )}
    </div>
  );
}

function AllTab({ items, searchParams }: { items: Record<string, import("@/lib/admin/catalog").CatalogEntry>; searchParams: Props["searchParams"] }) {
  const q = normalizeArabic(searchParams.q ?? "");
  const cat = searchParams.cat ?? "";
  const page = Math.max(1, Number(searchParams.page) || 1);

  const rows = Object.entries(items)
    .filter(([id, e]) => {
      if (cat === "hidden" ? !e.hidden : cat && (e.category !== cat || e.hidden)) return false;
      if (!q) return true;
      return normalizeArabic(`${id} ${e.title} ${e.subtitle ?? ""} ${e.searchText ?? ""}`).includes(q);
    })
    .sort(([, a], [, b]) => (b.addedAt ?? "").localeCompare(a.addedAt ?? ""));
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const link = (p: number) => `/admin/recordings?tab=all&q=${encodeURIComponent(searchParams.q ?? "")}&cat=${cat}&page=${p}`;

  return (
    <section className="flex flex-col gap-3">
      <form className="flex flex-wrap gap-2" action="/admin/recordings">
        <input type="hidden" name="tab" value="all" />
        <input
          name="q"
          defaultValue={searchParams.q}
          placeholder="ابحث بالعنوان أو السورة أو الـ ID"
          className="min-h-11 flex-1 rounded-xl border border-line-strong bg-ink px-4 text-text"
        />
        <select name="cat" defaultValue={cat} className="min-h-11 rounded-xl border border-line-strong bg-ink px-3 text-text">
          {SECTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <button type="submit" className="min-h-11 rounded-full border border-gold/50 px-5 text-sm font-semibold text-gold-soft">
          بحث
        </button>
      </form>
      <p className="text-sm text-muted">{rows.length} نتيجة</p>
      <ul className="flex flex-col gap-2">
        {shown.map(([id, e]) => (
          <EntryRow key={id} id={id} entry={e} />
        ))}
      </ul>
      {pages > 1 && (
        <nav className="flex items-center gap-3 text-sm">
          {page > 1 && <Link href={link(page - 1)} className="min-h-11 px-3 py-2.5 text-gold-soft">السابق</Link>}
          <span className="text-muted">صفحة {page} من {pages}</span>
          {page < pages && <Link href={link(page + 1)} className="min-h-11 px-3 py-2.5 text-gold-soft">التالي</Link>}
        </nav>
      )}
    </section>
  );
}
