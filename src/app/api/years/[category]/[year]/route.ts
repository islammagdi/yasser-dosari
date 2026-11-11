import { NextResponse } from "next/server";
import { recordings } from "@/lib/api";
import { getCategory } from "@/lib/categories";

/**
 * تسجيلات سنة هجرية واحدة من قسم (الفروض والتراويح): صفحة القسم بتجيبها لما الزائر يفتح السنة.
 * بتتخزن ٦ ساعات على Vercel، فالطلب التاني لنفس السنة بيرجع على طول.
 */
export async function GET(_req: Request, { params }: { params: { category: string; year: string } }) {
  const category = getCategory(params.category);
  const year = Number(params.year);
  if (!category || !Number.isInteger(year)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const items = (await recordings.list({ category: category.slug })).filter((r) => r.hijriYear === year);
  return NextResponse.json({ items }, { headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" } });
}
