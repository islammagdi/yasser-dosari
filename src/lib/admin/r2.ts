import { AwsClient } from "aws4fetch";

/**
 * قراءة وكتابة ملفات JSON على R2 من السيرفر بس (لوحة التحكم).
 * بيستخدم متغيرات R2_ENDPOINT و R2_ACCESS_KEY_ID و R2_SECRET_ACCESS_KEY و R2_BUCKET.
 */
const endpoint = (process.env.R2_ENDPOINT ?? "").replace(/\/$/, "");
const bucket = process.env.R2_BUCKET ?? "audio";

export const r2Enabled = () => Boolean(endpoint && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY);

let client: AwsClient | null = null;
function r2(): AwsClient {
  client ??= new AwsClient({
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    service: "s3",
    region: "auto",
  });
  return client;
}

const url = (key: string) => `${endpoint}/${bucket}/${key.replace(/^\//, "")}`;

/**
 * بيرجّع null لو الملف مش موجود.
 * tags: عشان الصفحات اللي بتقراه تتحدّث على طول أول ما اللوحة تحفظ (revalidateTag).
 */
export async function getJson<T>(key: string, tags: string[] = []): Promise<T | null> {
  if (!r2Enabled()) return null;
  const req = await r2().sign(url(key), { method: "GET" });
  const res = await fetch(req, { next: { tags, revalidate: 3600 } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`R2 GET ${key}: ${res.status}`);
  return (await res.json()) as T;
}

export async function putJson(key: string, data: unknown): Promise<void> {
  if (!r2Enabled()) throw new Error("R2 مش متظبط: راجع متغيرات R2_* على Vercel");
  // البيانات كـ bytes مش stream، عشان الطلب يتبعت بطول معروف (R2 بيرفض الطلب من غير Content-Length)
  const body = new TextEncoder().encode(JSON.stringify(data));
  const signed = await r2().sign(url(key), {
    method: "PUT",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body,
  });
  const res = await fetch(signed.url, { method: "PUT", headers: signed.headers, body, cache: "no-store" });
  if (!res.ok) throw new Error(`R2 PUT ${key}: ${res.status} ${await res.text()}`);
}

/** حذف ملف (بيتجاهل لو مش موجود) */
export async function deleteKey(key: string): Promise<void> {
  if (!r2Enabled()) return;
  await r2().fetch(url(key), { method: "DELETE" });
}

/** كل المفاتيح اللي بتبدأ بـ prefix (ListObjectsV2، صفحة صفحة) */
export async function listKeys(prefix: string): Promise<string[]> {
  if (!r2Enabled()) return [];
  const keys: string[] = [];
  let token = "";
  do {
    const q = new URLSearchParams({ "list-type": "2", prefix, ...(token && { "continuation-token": token }) });
    const res = await r2().fetch(`${endpoint}/${bucket}?${q}`, { method: "GET" });
    if (!res.ok) throw new Error(`R2 LIST ${prefix}: ${res.status}`);
    const xml = await res.text();
    for (const m of xml.matchAll(/<Key>([^<]+)<\/Key>/g)) keys.push(m[1]);
    token = /<IsTruncated>true<\/IsTruncated>/.test(xml) ? xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/)?.[1] ?? "" : "";
  } while (token);
  return keys;
}

/** قراءة ملف من غير cache (للاشتراكات وقت الإرسال) */
export async function getFresh<T>(key: string): Promise<T | null> {
  if (!r2Enabled()) return null;
  const res = await r2().fetch(url(key), { method: "GET", cache: "no-store" } as RequestInit);
  if (!res.ok) return null;
  return (await res.json()) as T;
}

/**
 * رابط رفع مؤقت (presigned PUT): المتصفح بيرفع الملف على R2 مباشرة من غير ما يعدّي على Vercel،
 * فمفيش حد لحجم الملف. الرابط بيشتغل لمدة expires ثانية ولمفتاح واحد بس.
 * محتاج إعداد CORS على الـ bucket يسمح بـ PUT من دومين الموقع.
 */
export async function presignPut(key: string, expires = 900): Promise<string> {
  if (!r2Enabled()) throw new Error("R2 مش متظبط: راجع متغيرات R2_* على Vercel");
  const signed = await r2().sign(`${url(key)}?X-Amz-Expires=${expires}`, { method: "PUT", aws: { signQuery: true } });
  return signed.url;
}
