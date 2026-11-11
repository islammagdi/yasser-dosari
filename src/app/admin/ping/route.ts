// اللوحة بتنادي الرابط ده كل شوية طول ما إنت شغال فيها، والـ middleware بيمدّ الجلسة
export const dynamic = "force-dynamic";

export function GET() {
  return new Response(null, { status: 204 });
}
