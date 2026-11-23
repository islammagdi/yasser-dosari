import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE } from "@/lib/admin/session";
import { DAY_TTL, K, dayKey, pipeline, statsEnabled, type Cmd } from "@/lib/stats/redis";

/**
 * استقبال أحداث الإحصائيات (/api/t). بيرد على طول بـ 204، والكتابة في Redis في نفس الطلب.
 * - مش بنخزن IP ولا User-Agent: بنعمل منهم بصمة يومية متشفّرة (SHA-256 + سر الموقع + التاريخ)،
 *   فنفس الزائر بيتحسب مرة في اليوم، ومينفعش نتتبعه من يوم لليوم ولا نعرف هو مين.
 * - زيارات الأدمن والبوتات مش بتتحسب.
 */
export const runtime = "edge";

const BOT = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|preview|headless|lighthouse|vercel|monitor/i;
const EVENTS = new Set(["pageview", "play", "clip_view", "clip_share", "clip_download", "share", "save_offline", "install", "push_subscribe", "search"]);

async function visitorHash(day: string, ip: string, ua: string): Promise<string> {
  const salt = process.env.STATS_SALT ?? process.env.ADMIN_PASSWORD ?? "yd";
  const data = new TextEncoder().encode(`${day}|${ip}|${ua}|${salt}`);
  const buf = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  return Array.from(buf.slice(0, 12), (b) => b.toString(16).padStart(2, "0")).join("");
}

const clean = (s: unknown, max = 200) => (typeof s === "string" ? s.slice(0, max) : "");

function refHost(ref: string, host: string): string | null {
  if (!ref) return null;
  if (ref === "direct") return "direct";
  try {
    const h = new URL(ref).hostname.replace(/^www\./, "").replace(/^(m|l|lm)\./, "");
    if (!h || h === host.replace(/^www\./, "")) return null;
    return h;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const done = new NextResponse(null, { status: 204 });
  if (!statsEnabled()) return done;
  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || BOT.test(ua) || req.cookies.get(ADMIN_COOKIE)) return done;

  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return done;
  }
  const type = clean(b.type, 30);
  if (!EVENTS.has(type)) return done;
  const path = clean(b.path, 300);
  if (!path.startsWith("/") || path.startsWith("/admin") || path.startsWith("/api")) return done;

  const day = dayKey();
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.ip || "0";
  const vid = await visitorHash(day, ip, ua);
  const id = clean(b.id, 120);
  const title = clean(b.title, 160);
  const cmds: Cmd[] = [];
  const touched = new Set<string>();
  const add = (key: string, ...cmd: (string | number)[]) => {
    cmds.push([cmd[0], key, ...cmd.slice(1)]);
    touched.add(key);
  };

  // أي نشاط = الزائر موجود ومتواجد دلوقتي
  add(K.uv(day), "PFADD", vid);
  cmds.push(["ZADD", K.live, Date.now(), vid]);

  if (type === "pageview") {
    add(K.pv(day), "INCR");
    add(K.pages(day), "ZINCRBY", 1, path);
    const pageTitle = clean(b.pageTitle, 160);
    if (pageTitle) cmds.push(["HSET", K.titles, `p:${path}`, pageTitle]);
    const w = Number(b.w) || 0;
    add(K.dev(day), "HINCRBY", w && w < 768 ? "mobile" : w && w < 1280 ? "tablet" : "desktop", 1);
    add(K.lang(day), "HINCRBY", clean(b.lang, 5) === "en" ? "en" : "ar", 1);
    const country = req.headers.get("x-vercel-ip-country") ?? req.geo?.country;
    if (country) add(K.ctry(day), "ZINCRBY", 1, country.slice(0, 2).toUpperCase());
    const host = req.headers.get("host") ?? "";
    const ref = refHost(clean(b.ref, 300), host);
    if (ref) add(K.ref(day), "ZINCRBY", 1, ref);
  } else {
    add(K.ev(day), "HINCRBY", type, 1);
    if (type === "play" && id) {
      add(K.plays(day), "ZINCRBY", 1, id);
      if (title) cmds.push(["HSET", K.titles, `r:${id}`, title]);
    }
    if (type === "clip_view" && id) {
      add(K.clips(day), "ZINCRBY", 1, id);
      if (title) cmds.push(["HSET", K.titles, `c:${id}`, title]);
    }
  }
  for (const key of touched) cmds.push(["EXPIRE", key, DAY_TTL]);

  try {
    await pipeline(cmds);
  } catch {
    /* لو Redis وقع، الموقع يكمّل عادي */
  }
  return done;
}
