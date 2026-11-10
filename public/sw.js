// Service worker الموقع:
// ١) التلاوات المحفوظة للاستماع بدون إنترنت: بتتشغّل من الجهاز (مع دعم التقديم والتأخير).
// ٢) الصفحات: من السيرفر دايمًا لو فيه نت (فمفيش نسخ قديمة)، ومن آخر نسخة محفوظة لو مفيش.
// ٣) ملفات الموقع الثابتة (JS و CSS والأيقونات): أساميها بتتغير مع كل تحديث، فتخزينها آمن.
const AUDIO = "yd-audio-v1";
const PAGES = "yd-pages-v1";
const STATIC = "yd-static-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (req.destination === "audio" || /\.(mp3|m4a)(\?|$)/i.test(url.pathname)) {
    event.respondWith(audio(req));
    return;
  }
  if (req.mode === "navigate" && url.origin === self.location.origin && !url.pathname.startsWith("/admin")) {
    event.respondWith(page(req));
    return;
  }
  if (url.origin === self.location.origin && (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/images/"))) {
    event.respondWith(cacheFirst(req));
    return;
  }
  if (url.hostname === "fonts.gstatic.com" || url.hostname === "fonts.googleapis.com") {
    event.respondWith(cacheFirst(req));
  }
});

/** تلاوة محفوظة؟ بنرجّعها من الجهاز، وبنقطع منها الجزء المطلوب لو المشغّل طلب Range */
async function audio(req) {
  const cache = await caches.open(AUDIO);
  const hit = await cache.match(req.url, { ignoreSearch: true });
  if (!hit) return fetch(req);

  const range = req.headers.get("range");
  if (!range) return hit;
  const buf = await hit.arrayBuffer();
  const size = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  let start = m && m[1] ? Number(m[1]) : 0;
  let end = m && m[2] ? Number(m[2]) : size - 1;
  if (m && !m[1] && m[2]) {
    start = Math.max(0, size - Number(m[2]));
    end = size - 1;
  }
  end = Math.min(end, size - 1);
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      "Content-Type": hit.headers.get("Content-Type") || "audio/mpeg",
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
    },
  });
}

/** الصفحة من السيرفر، ولو مفيش نت: آخر نسخة اتفتحت، وإلا صفحة المحفوظات */
async function page(req) {
  const cache = await caches.open(PAGES);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return (
      (await cache.match(req, { ignoreSearch: true })) ||
      (await cache.match("/saved")) ||
      new Response("<h1 dir='rtl'>لا يوجد اتصال بالإنترنت</h1>", { headers: { "Content-Type": "text/html; charset=utf-8" } })
    );
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === "opaque") cache.put(req, res.clone());
  return res;
}
