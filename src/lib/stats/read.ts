import { K, lastDays, pipeline, statsEnabled } from "./redis";

export interface Ranked {
  key: string;
  label: string;
  count: number;
}

export interface StatsReport {
  days: string[];
  visitors: number[];
  pageviews: number[];
  plays: number[];
  totals: { visitors: number; pageviews: number; plays: number; clipViews: number };
  /** الزوار في نفس المدة اللي قبلها (للمقارنة) */
  prevVisitors: number;
  online: number;
  pages: Ranked[];
  recordings: Ranked[];
  clips: Ranked[];
  countries: Ranked[];
  referrers: Ranked[];
  devices: Ranked[];
  langs: Ranked[];
  events: Record<string, number>;
}

const ONLINE_MS = 5 * 60_000;

/** ZRANGE ... WITHSCORES بيرجع [عضو، رقم، عضو، رقم...] */
function pairs(v: unknown): [string, number][] {
  if (!Array.isArray(v)) return [];
  const out: [string, number][] = [];
  for (let i = 0; i + 1 < v.length; i += 2) out.push([String(v[i]), Number(v[i + 1])]);
  return out;
}

function hash(v: unknown): Record<string, number> {
  const o: Record<string, number> = {};
  if (Array.isArray(v)) for (let i = 0; i + 1 < v.length; i += 2) o[String(v[i])] = Number(v[i + 1]);
  return o;
}

const top = (m: Map<string, number>, n: number) =>
  [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([key, count]) => ({ key, label: key, count }));

const COUNTRY = new Intl.DisplayNames(["ar"], { type: "region" });
const countryName = (code: string) => {
  try {
    return COUNTRY.of(code) ?? code;
  } catch {
    return code;
  }
};

const DEVICE: Record<string, string> = { mobile: "موبايل", tablet: "تابلت", desktop: "كمبيوتر" };
const LANG: Record<string, string> = { ar: "العربية", en: "English" };
const REF: Record<string, string> = { direct: "مباشر (رابط محفوظ أو مكتوب)" };

export async function loadStats(range: number): Promise<StatsReport | null> {
  if (!statsEnabled()) return null;
  const days = lastDays(range);
  const prev = lastDays(range * 2).slice(0, range);
  const now = Date.now();

  // أوامر كل يوم بالترتيب ده، وبعدها الإجماليات
  const perDay = ["pv", "uv", "pages", "plays", "clips", "ev", "ctry", "ref", "dev", "lang"] as const;
  const cmds: (string | number)[][] = [];
  for (const d of days) {
    cmds.push(["GET", K.pv(d)], ["PFCOUNT", K.uv(d)]);
    cmds.push(["ZRANGE", K.pages(d), 0, 199, "REV", "WITHSCORES"]);
    cmds.push(["ZRANGE", K.plays(d), 0, 199, "REV", "WITHSCORES"]);
    cmds.push(["ZRANGE", K.clips(d), 0, 199, "REV", "WITHSCORES"]);
    cmds.push(["HGETALL", K.ev(d)]);
    cmds.push(["ZRANGE", K.ctry(d), 0, 99, "REV", "WITHSCORES"]);
    cmds.push(["ZRANGE", K.ref(d), 0, 99, "REV", "WITHSCORES"]);
    cmds.push(["HGETALL", K.dev(d)], ["HGETALL", K.lang(d)]);
  }
  const tail = cmds.length;
  cmds.push(["PFCOUNT", ...days.map(K.uv)]);
  cmds.push(["PFCOUNT", ...prev.map(K.uv)]);
  cmds.push(["ZREMRANGEBYSCORE", K.live, 0, now - ONLINE_MS]);
  cmds.push(["ZCARD", K.live]);

  const res = await pipeline(cmds);
  const n = perDay.length;

  const pages = new Map<string, number>();
  const recs = new Map<string, number>();
  const clips = new Map<string, number>();
  const ctry = new Map<string, number>();
  const refs = new Map<string, number>();
  const devs = new Map<string, number>();
  const langs = new Map<string, number>();
  const events: Record<string, number> = {};
  const visitors: number[] = [];
  const pageviews: number[] = [];
  const plays: number[] = [];
  const bump = (m: Map<string, number>, k: string, c: number) => m.set(k, (m.get(k) ?? 0) + c);

  days.forEach((_, i) => {
    const r = res.slice(i * n, i * n + n);
    pageviews.push(Number(r[0]) || 0);
    visitors.push(Number(r[1]) || 0);
    for (const [k, c] of pairs(r[2])) bump(pages, k, c);
    let dayPlays = 0;
    for (const [k, c] of pairs(r[3])) {
      bump(recs, k, c);
      dayPlays += c;
    }
    plays.push(dayPlays);
    for (const [k, c] of pairs(r[4])) bump(clips, k, c);
    for (const [k, c] of Object.entries(hash(r[5]))) events[k] = (events[k] ?? 0) + c;
    for (const [k, c] of pairs(r[6])) bump(ctry, k, c);
    for (const [k, c] of pairs(r[7])) bump(refs, k, c);
    for (const [k, c] of Object.entries(hash(r[8]))) bump(devs, k, c);
    for (const [k, c] of Object.entries(hash(r[9]))) bump(langs, k, c);
  });

  const topPages = top(pages, 15);
  const topRecs = top(recs, 15);
  const topClips = top(clips, 10);

  // أسماء الصفحات والتسجيلات
  const fields = [...topPages.map((p) => `p:${p.key}`), ...topRecs.map((r) => `r:${r.key}`), ...topClips.map((c) => `c:${c.key}`)];
  const names = fields.length ? ((await pipeline([["HMGET", K.titles, ...fields]]))[0] as (string | null)[] | null) ?? [] : [];
  const strip = (t: string) => t.replace(/\s*\|\s*الشيخ ياسر الدوسري$/, "").replace(/\s*\|\s*Sheikh Yasser Al-Dosari$/, "");
  let j = 0;
  for (const list of [topPages, topRecs, topClips]) {
    for (const item of list) {
      const t = names[j++];
      if (t) item.label = strip(t);
    }
  }
  for (const p of topPages) if (p.key === "/") p.label = "الرئيسية";

  return {
    days,
    visitors,
    pageviews,
    plays,
    totals: {
      visitors: Number(res[tail]) || 0,
      pageviews: pageviews.reduce((a, b) => a + b, 0),
      plays: plays.reduce((a, b) => a + b, 0),
      clipViews: [...clips.values()].reduce((a, b) => a + b, 0),
    },
    prevVisitors: Number(res[tail + 1]) || 0,
    online: Number(res[tail + 3]) || 0,
    pages: topPages,
    recordings: topRecs,
    clips: topClips,
    countries: top(ctry, 12).map((c) => ({ ...c, label: countryName(c.key) })),
    referrers: top(refs, 10).map((r) => ({ ...r, label: REF[r.key] ?? r.key })),
    devices: top(devs, 3).map((d) => ({ ...d, label: DEVICE[d.key] ?? d.key })),
    langs: top(langs, 2).map((l) => ({ ...l, label: LANG[l.key] ?? l.key })),
    events,
  };
}
