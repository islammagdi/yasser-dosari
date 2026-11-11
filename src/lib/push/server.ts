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
