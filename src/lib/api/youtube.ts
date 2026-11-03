import type { Category, LectureType, Prayer, Recording } from "@/types";
import { hijriDateLabel } from "@/lib/labels";
import { normalizeArabic } from "@/lib/format";
import { SURAH_NAMES, surahName } from "@/lib/quran";

/**
 * الفروض والتراويح والخطب من قناة يوتيوب (YouTube Data API v3).
 * القوايم بتتصنّف تلقائيًا من اسمها: "فروض شهر ..." ← فروض، "رمضان/تراويح" ← تراويح، "خطب/محاضرات" ← محاضرات.
 */
const API = "https://www.googleapis.com/youtube/v3";
const KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID ?? "UClncV9OLPto_MinRzGfjr2g";
/** المصحف المرتل من إنتاج المركز السعودي للتلاوات القرآنية (قناة المركز على يوتيوب) */
const MUSHAF_PLAYLIST = process.env.YOUTUBE_MUSHAF_PLAYLIST ?? "PLbi9UdPlMRS635t0pMgYJARJGYu4BAhe8";
/** البيانات بتتحدّث كل ٦ ساعات */
const REVALIDATE = 60 * 60 * 6;

export const youtubeEnabled = () => Boolean(KEY);

interface YtPage<T> {
  items?: T[];
  nextPageToken?: string;
}
interface YtPlaylist {
  id: string;
  snippet: { title: string };
}
interface YtItem {
  snippet: {
    title: string;
    publishedAt: string;
        resourceId: { videoId: string };
    position?: number;
    thumbnails?: Record<string, { url: string }>;
  };
}

async function fetchAll<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  let pageToken = "";
  do {
    const res = await fetch(`${API}/${path}&maxResults=50&pageToken=${pageToken}&key=${KEY}`, {
      next: { revalidate: REVALIDATE },
    });
    if (!res.ok) throw new Error(`YouTube ${res.status}`);
    const page = (await res.json()) as YtPage<T>;
    out.push(...(page.items ?? []));
    pageToken = page.nextPageToken ?? "";
  } while (pageToken);
  return out;
}

// ---------- قراءة العناوين ----------

/** أرقام إنجليزي، ومن غير علامات اتجاه النص اللي يوتيوب بيحطها */
function clean(s: string): string {
  return s
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const MONTHS: [RegExp, number][] = [
  [/محرم/, 1],
  [/صفر/, 2],
  [/ربيع\s*(الأول|الاول)/, 3],
  [/ربيع\s*(الآخر|الاخر|الثاني)/, 4],
  [/جمادى\s*(الأولى|الاولى)/, 5],
  [/جمادى\s*(الآخرة|الاخرة|الثانية)/, 6],
  [/رجب/, 7],
  [/شعبان/, 8],
  [/رمضان/, 9],
  [/شوال/, 10],
  [/(ذو|ذي)\s*القعدة/, 11],
  [/(ذو|ذي)\s*ال?حجة/, 12],
];
const monthFrom = (s: string) => MONTHS.find(([re]) => re.test(s))?.[1];
const yearFrom = (s: string) => {
  const m = s.match(/(1[34]\d{2})/);
  return m ? Number(m[1]) : undefined;
};

/** "2-4-1448" أو "7 محرم 1448" أو "3-ذو القعدة-1443" أو "غرة صفر 1442" */
function dateFrom(t: string): { day?: number; month?: number; year?: number } {
  let m = t.match(/(\d{1,2})\s*[-/]\s*(\d{1,2})\s*[-/]\s*(1[34]\d{2})/);
  if (m) return { day: +m[1], month: +m[2], year: +m[3] };
  m = t.match(/(\d{1,2}|غرة)[\s-]+([^\d|~]{3,16}?)[\s-]+(1[34]\d{2})/);
  if (m) {
    const month = monthFrom(m[2]);
    if (month) return { day: m[1] === "غرة" ? 1 : +m[1], month, year: +m[3] };
  }
  // أيام الحج المعروفة بالاسم
  const hajj = /يوم التروية/.test(t) ? 8 : /يوم عرفة/.test(t) ? 9 : /عيد الأضحى/.test(t) ? 10 : undefined;
  if (hajj) return { day: hajj, month: 12, year: yearFrom(t) };
  return {};
}

type PrayerKey = Prayer | "jumuah";
const PRAYER_NAMES: Record<PrayerKey, string> = { fajr: "الفجر", maghrib: "المغرب", isha: "العشاء", jumuah: "الجمعة" };

function prayersFrom(t: string): PrayerKey[] {
  const list: PrayerKey[] = [];
  if (/فجر/.test(t)) list.push("fajr");
  if (/مغرب|العشائين/.test(t)) list.push("maghrib");
  if (/عشاء|عشائية|العشائين/.test(t)) list.push("isha");
  if (/صلاة الجمعة/.test(t)) list.push("jumuah");
  return list;
}

function prayerLabel(list: PrayerKey[]): string {
  if (list.length === 0) return "فروض اليوم";
  const names = list.map((p) => PRAYER_NAMES[p]).join(" و");
  return list.length === 1 ? `صلاة ${names}` : list.length === 2 ? `صلاتا ${names}` : `صلوات ${names}`;
}

const NIGHT_WORDS = ["الأولى", "الثانية", "الثالثة", "الرابعة", "الخامسة", "السادسة", "السابعة", "الثامنة", "التاسعة", "العاشرة"];
function nightFrom(t: string): number | undefined {
  const m = t.match(/ليل[ةه]\s*(\d{1,2})/) ?? t.match(/(\d{1,2})\s*[-\s]\s*(رمضان|9\s*-\s*1[34]\d{2})/);
  if (m) return +m[1];
  const i = NIGHT_WORDS.findIndex((w) => t.includes(`الليلة ${w}`));
  return i >= 0 ? i + 1 : undefined;
}

/** وصف التلاوة: الجزء اللي قبل آخر "|"، من غير اسم الشيخ والتاريخ */
function describe(t: string): string {
  const parts = t.split(/\s*[|~]\s*/).filter(Boolean);
  const d = parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0] ?? "";
  return d
    .replace(/(?:لفضيلة الشيخ|فضيلة الشيخ|لل?شيخ|الشيخ)?\s*:?\s*(?:أ\.?\s*د\.?|د\.?)?\s*ياسر\s*(?:بن\s*راشد\s*)?الدوسري/g, "")
    .replace(/\d{1,2}\s*[-/]\s*\d{1,2}\s*[-/]\s*1[34]\d{2}\s*(هـ)?/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s|:،.-]+|[\s|:،.-]+$/g, "")
    .trim();
}

function classify(title: string): { category: Category; lectureType?: LectureType } | null {
  if (/^فروض/.test(title)) return { category: "fard" };
  if (/خطب/.test(title)) return { category: "lectures", lectureType: "khutbah" };
  if (/محاضرات|دروس/.test(title)) return { category: "lectures", lectureType: "lesson" };
  if (/المصحف المرتل/.test(title)) return null; // المصحف جاي من mp3quran
  if (/رمضان|تراويح|ليالي/.test(title)) return { category: "taraweeh" };
  return null;
}

function toRecording(item: YtItem, playlistTitle: string, cls: { category: Category; lectureType?: LectureType }): Recording | null {
  const raw = item.snippet.title;
  if (/^(Private|Deleted) video$/i.test(raw)) return null;
  const t = clean(raw);
  const videoId = item.snippet.resourceId.videoId;
  const th = item.snippet.thumbnails ?? {};
  const date = dateFrom(t);
  const year = date.year ?? yearFrom(playlistTitle);
  const description = describe(t);

  const base = {
    id: `yt-${videoId}`,
    youtubeId: videoId,
    audioUrl: "",
    imageUrl: (th.high ?? th.medium ?? th.default)?.url,
    addedAt: item.snippet.publishedAt,
    // العنوان الأصلي كامل للبحث، عشان أي كلمة فيه تتلاقي حتى لو مش ظاهرة في الكارت
    searchText: t,
  };

  if (cls.category === "fard") {
    const prayers = prayersFrom(t);
    return {
      ...base,
      category: "fard",
      title: "",
      subtitle: description || undefined,
      prayer: prayers.find((p): p is Prayer => p !== "jumuah"),
      prayerLabel: prayerLabel(prayers),
      hijriYear: year,
      hijriMonth: date.month ?? monthFrom(playlistTitle),
      hijriDay: date.day,
    };
  }
  if (cls.category === "taraweeh") {
    return {
      ...base,
      category: "taraweeh",
      title: description || t,
      subtitle: description || undefined,
      hijriYear: year,
      night: nightFrom(t),
    };
  }
  return {
    ...base,
    category: "lectures",
    lectureType: cls.lectureType,
    title: description || t,
    subtitle: hijriDateLabel(date.day, date.month, date.year) || undefined,
    hijriYear: date.year,
    hijriMonth: date.month,
    hijriDay: date.day,
  };
}

export async function fetchYoutube(category: Category): Promise<Recording[]> {
  const playlists = await fetchAll<YtPlaylist>(`playlists?part=snippet&channelId=${CHANNEL_ID}`);
  const matching = playlists
    .map((p) => ({ p, title: clean(p.snippet.title), cls: classify(clean(p.snippet.title)) }))
    .filter((x) => x.cls?.category === category);

  const lists = await Promise.all(
    matching.map(async ({ p, title, cls }) =>
      (await fetchAll<YtItem>(`playlistItems?part=snippet&playlistId=${p.id}`)).map((it) => toRecording(it, title, cls!)),
    ),
  );

  // نفس الفيديو ممكن يكون في أكتر من قايمة
  const seen = new Set<string>();
  return lists.flat().filter((r): r is Recording => {
    if (!r || seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}

// ---------- المصحف المرتل (فيديو) ----------

/** أسماء السور مرتبة من الأطول للأقصر، عشان "سورة ق" متتلخبطش مع "سورة قريش" */
const SURAH_PATTERNS = SURAH_NAMES.map((name, i) => ({ n: i + 1, key: normalizeArabic(name) })).sort(
  (a, b) => b.key.length - a.key.length,
);

function surahFrom(title: string): number | undefined {
  const t = normalizeArabic(title);
  return SURAH_PATTERNS.find(({ key }) => new RegExp(`سوره\\s*${key}(?![\\u0600-\\u06FF])`).test(t))?.n;
}

export async function fetchYoutubeMushaf(): Promise<Recording[]> {
  const items = await fetchAll<YtItem>(`playlistItems?part=snippet&playlistId=${MUSHAF_PLAYLIST}`);
  const seen = new Set<number>();
  const out: Recording[] = [];
  for (const it of items) {
    if (/^(Private|Deleted) video$/i.test(it.snippet.title)) continue;
    const t = clean(it.snippet.title);
    // رقم السورة من العنوان، ولو مش واضح نعتمد على ترتيب الفيديو في القايمة
    const n = surahFrom(t) ?? (it.snippet.position ?? -1) + 1;
    if (n < 1 || n > 114 || seen.has(n)) continue;
    seen.add(n);
    const th = it.snippet.thumbnails ?? {};
    out.push({
      id: `yt-mushaf-${it.snippet.resourceId.videoId}`,
      category: "mushaf",
      surah: n,
      title: `سورة ${surahName(n)}`,
      subtitle: "إنتاج المركز السعودي للتلاوات القرآنية",
      versionLabel: "المركز السعودي (فيديو)",
      youtubeId: it.snippet.resourceId.videoId,
      audioUrl: "",
      imageUrl: (th.high ?? th.medium ?? th.default)?.url,
      searchText: t,
    });
  }
  return out.sort((a, b) => (a.surah ?? 0) - (b.surah ?? 0));
}