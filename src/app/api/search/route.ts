import { NextResponse } from "next/server";
import { recordings } from "@/lib/api";
import { CATEGORIES } from "@/lib/categories";
import { matchesSearch, searchTerms } from "@/lib/search";

/** أقصى عدد نتايج بيرجع من كل قسم (الباقي بيتعرض في صفحة القسم نفسه) */
const PER_CATEGORY = 60;

/** GET /api/search?q=الزخرف ← النتايج من كل الأقسام، مجمّعة بالقسم */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const q = params.get("q") ?? "";
  // ?category=fard: البحث جوه قسم واحد (صفحة القسم)، وبيرجّع نتايج أكتر
  const only = CATEGORIES.find((c) => c.slug === params.get("category"));
  const terms = searchTerms(q);
  if (terms.join("").length < 2) return NextResponse.json({ groups: [] });

  const limit = only ? 300 : PER_CATEGORY;
  const groups = await Promise.all(
    (only ? [only] : CATEGORIES).map(async (c) => {
      const hits = (await recordings.list({ category: c.slug })).filter((r) => matchesSearch(r, terms));
      return { slug: c.slug, title: c.title, total: hits.length, items: hits.slice(0, limit) };
    }),
  );

  return NextResponse.json({ groups: groups.filter((g) => g.total > 0) });
}