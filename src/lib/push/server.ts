import { createHash } from "node:crypto";
import webpush from "web-push";
import { deleteKey, getFresh, listKeys, putJson } from "@/lib/admin/r2";

/**
 * إشعارات الويب (Web Push): الاشتراكات محفوظة على R2، كل جهاز في ملف لوحده.
 * اسم الملف بصمة من عنوان الاشتراك، فمحدش يقدر يخمّنه.
 */
const PREFIX = "push/subs/";

export interface StoredSub {
  subscription: webpush.PushSubscription;
  /** الأنواع اللي الجهاز مشترك فيها */
  topics: { recitations?: boolean };
  createdAt: string;
}

export interface PushMessage {
  title: string;
  body: string;
  url?: string;
}

const keyFor = (endpoint: string) => `${PREFIX}${createHash("sha256").update(endpoint).digest("hex").slice(0, 40)}.json`;

/** خدمات الإشعارات المعروفة بس (جوجل، موزيلا، أبل، مايكروسوفت) */
export function validSubscription(s: unknown): s is webpush.PushSubscription {
  const sub = s as webpush.PushSubscription;
  try {
    const host = new URL(sub.endpoint).hostname;
    const known = /(^|\.)(fcm\.googleapis\.com|push\.services\.mozilla\.com|push\.apple\.com|notify\.windows\.com)$/.test(host);
    return known && typeof sub.keys?.p256dh === "string" && typeof sub.keys?.auth === "string";
  } catch {
    return false;
  }
}

export async function saveSubscription(sub: webpush.PushSubscription, topics: StoredSub["topics"]) {
  await putJson(keyFor(sub.endpoint), { subscription: sub, topics, createdAt: new Date().toISOString() } satisfies StoredSub);
}

export async function deleteSubscription(endpoint: string) {
  await deleteKey(keyFor(endpoint));
}

export async function countSubscriptions(): Promise<number> {
  return (await listKeys(PREFIX)).length;
}

let configured = false;
function configure() {
  if (configured) return;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) throw new Error("مفاتيح الإشعارات (VAPID) مش متظبطة على Vercel");
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", pub, priv);
  configured = true;
}

/** بيبعت لكل المشتركين في النوع ده، وبيمسح الاشتراكات اللي انتهت (الزائر لغى أو مسح المتصفح) */
export async function broadcast(topic: keyof StoredSub["topics"], msg: PushMessage): Promise<{ sent: number; removed: number; failed: number }> {
  configure();
  const keys = await listKeys(PREFIX);
  const payload = JSON.stringify(msg);
  let sent = 0;
  let removed = 0;
  let failed = 0;
  // دفعات من ٥٠ عشان منضغطش على السيرفر
  for (let i = 0; i < keys.length; i += 50) {
    await Promise.all(
      keys.slice(i, i + 50).map(async (key) => {
        const s = await getFresh<StoredSub>(key);
        if (!s?.topics?.[topic]) return;
        try {
          await webpush.sendNotification(s.subscription, payload, { TTL: 60 * 60 * 24, urgency: "normal" });
          sent++;
        } catch (err) {
          const code = (err as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) {
            await deleteKey(key);
            removed++;
          } else failed++;
        }
      }),
    );
  }
  return { sent, removed, failed };
}

// ---------- تذكير الورد اليومي ----------
// كل جهاز فعّل التذكير ليه ملف في push/wird/ فيه الاشتراك والساعة والمنطقة الزمنية وآخر يوم اتبعتله فيه.

const WIRD_PREFIX = "push/wird/";

interface WirdReminder {
  subscription: webpush.PushSubscription;
  /** "20:00" بتوقيت الزائر */
  time: string;
  /** المنطقة الزمنية بتاعة جهاز الزائر، زي Africa/Cairo */
  tz: string;
  /** آخر يوم (بتوقيت الزائر) اتبعتله فيه التذكير */
  lastSent?: string;
}

const wirdKey = (endpoint: string) => `${WIRD_PREFIX}${createHash("sha256").update(endpoint).digest("hex").slice(0, 40)}.json`;

export async function saveWirdReminder(sub: webpush.PushSubscription, time: string, tz: string) {
  const prev = await getFresh<WirdReminder>(wirdKey(sub.endpoint));
  await putJson(wirdKey(sub.endpoint), { subscription: sub, time, tz, lastSent: prev?.lastSent } satisfies WirdReminder);
}

export async function deleteWirdReminder(endpoint: string) {
  await deleteKey(wirdKey(endpoint));
}

export async function countWirdReminders(): Promise<number> {
  return (await listKeys(WIRD_PREFIX)).length;
}

/** الساعة والتاريخ دلوقتي في منطقة زمنية معيّنة */
function localNow(tz: string, now: Date) {
  try {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
        .formatToParts(now)
        .map((x) => [x.type, x.value]),
    );
    return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
  } catch {
    return null;
  }
}

/**
 * بيتنادي كل ١٥ دقيقة: بيبعت التذكير لكل جهاز وصل ميعاده النهارده ولسه متبعتلوش.
 * لو المهمة اتأخرت أكتر من ساعة عن الميعاد، بنستنى بكرة بدل ما نبعت في وقت غريب.
 */
export async function sendDueWirdReminders(now = new Date()): Promise<{ checked: number; sent: number; removed: number }> {
  configure();
  const keys = await listKeys(WIRD_PREFIX);
  let sent = 0;
  let removed = 0;
  const payload = JSON.stringify({ title: "وردك اليوم 📖", body: "حان وقت وردك. استمع لورد اليوم بصوت الشيخ ياسر الدوسري.", url: "/" } satisfies PushMessage);
  for (let i = 0; i < keys.length; i += 50) {
    await Promise.all(
      keys.slice(i, i + 50).map(async (key) => {
        const r = await getFresh<WirdReminder>(key);
        if (!r) return;
        const local = localNow(r.tz, now);
        const [h, m] = r.time.split(":").map(Number);
        const due = h * 60 + m;
        if (!local || r.lastSent === local.date || local.minutes < due || local.minutes - due > 60) return;
        try {
          await webpush.sendNotification(r.subscription, payload, { TTL: 60 * 60 * 3, urgency: "normal" });
          await putJson(key, { ...r, lastSent: local.date });
          sent++;
        } catch (err) {
          const code = (err as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) {
            await deleteKey(key);
            removed++;
          }
        }
      }),
    );
  }
  return { checked: keys.length, sent, removed };
}
