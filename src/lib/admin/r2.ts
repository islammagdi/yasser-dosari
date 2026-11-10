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
