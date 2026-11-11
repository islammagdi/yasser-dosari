import { NextResponse } from "next/server";
import { deleteSubscription } from "@/lib/push/server";

export async function POST(req: Request) {
  try {
    const { endpoint } = (await req.json()) as { endpoint?: string };
    if (typeof endpoint !== "string" || !endpoint.startsWith("https://")) throw new Error();
    await deleteSubscription(endpoint);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
}
