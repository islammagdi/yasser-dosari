// Service worker الموقع:
// ١) التلاوات المحفوظة للاستماع بدون إنترنت: بتتشغّل من الجهاز (مع دعم التقديم والتأخير).
// ٢) الصفحات: من السيرفر دايمًا لو فيه نت (فمفيش نسخ قديمة)، ومن آخر نسخة محفوظة لو مفيش.
// ٣) ملفات الموقع الثابتة (JS و CSS والأيقونات): أساميها بتتغير مع كل تحديث، فتخزينها آمن.
// v2 للـ service worker نفسه (التلاوات العادية مبقتش بتعدّي عليه)، والكاش زي ما هو
const AUDIO = "yd-audio-v1";
const PAGES = "yd-pages-v1";
const STATIC = "yd-static-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(warm());
});

// الصفحة بتطلب تجهيز الوضع بدون إنترنت (مرة كل جلسة، وبعد حفظ أي تلاوة)
self.addEventListener("message", (event) => {
  if (event.data === "warm-offline") event.waitUntil(warm());
});

/**
 * بيحفظ الرئيسية وصفحة المحفوظات، ومعاهم ملفات JS و CSS والخطوط اللي محتاجينها،
 * عشان الموقع يفتح وتقدر تشغّل المحفوظ حتى لو أول مرة تفتحه من غير نت.
 */
async function warm() {
  const pages = await caches.open(PAGES);
  const assets = await caches.open(STATIC);
  const grab = async (url) => {
    if (await assets.match(url)) return null;
    const res = await fetch(url);
    if (!res.ok) return null;
    await assets.put(url, res.clone());
    return res;
  };
  for (const path of ["/", "/saved", "/en", "/en/saved"]) {
    try {
      const res = await fetch(path, { cache: "no-store" });
      if (!res.ok) continue;
      const html = await res.clone().text();
      await pages.put(new URL(path, self.location.origin).href, res);
      const files = [...new Set(html.match(/\/_next\/static\/[^"'\s\\)]+\.(?:js|css)/g) || [])];
      await Promise.all(
        files.map(async (f) => {
          const r = await grab(f).catch(() => null);
          // الخطوط جوه ملفات CSS
          if (r && f.endsWith(".css")) {
            const css = await r.text();
            const fonts = [...new Set(css.match(/\/_next\/static\/media\/[^"')\s]+/g) || [])];
            await Promise.all(fonts.map((u) => grab(u).catch(() => null)));
          }
        }),
      );
    } catch {
      /* مفيش نت دلوقتي: نحاول المرة الجاية */
    }
  }
}
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // التلاوات: بنتدخّل بس في المحفوظة للاستماع بدون إنترنت (عليها علامة yd-offline).
  // الباقي بيتحمّل من السيرفر مباشرة: لو عدّى على الـ service worker، المتصفح ممكن يوقفه
  // في نص تلاوة طويلة (أو مع تحديث الموقع) فالصوت يقف فجأة
  if (url.searchParams.get("yd-offline") === "1") {
    event.respondWith(audio(req, url));
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
async function audio(req, url) {
  url.searchParams.delete("yd-offline");
  const cache = await caches.open(AUDIO);
  const hit = await cache.match(url.href, { ignoreSearch: true });
  // مش موجودة (اتمسحت): من السيرفر بالرابط الأصلي
  if (!hit) return fetch(new Request(url.href, { headers: req.headers, mode: req.mode, credentials: req.credentials }));

  const range = req.headers.get("range");
  if (!range) return hit;
  // Blob بيتقطّع من الملف على الجهاز، من غير ما التلاوة كلها تتحمّل في الذاكرة مع كل طلب
  // (arrayBuffer كان بيحمّل ٤٠ ميجا كل شوية، والموبايل كان بيقفل الصفحة)
  const blob = await hit.blob();
  const size = blob.size;
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  let start = m && m[1] ? Number(m[1]) : 0;
  let end = m && m[2] ? Number(m[2]) : size - 1;
  if (m && !m[1] && m[2]) {
    start = Math.max(0, size - Number(m[2]));
    end = size - 1;
  }
  end = Math.min(end, size - 1);
  return new Response(blob.slice(start, end + 1), {
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
      (await cache.match(new URL(req.url).pathname.startsWith("/en") ? "/en/saved" : "/saved")) ||
      (await cache.match("/saved")) ||
      new Response("<h1 dir='rtl'>لا يوجد اتصال بالإنترنت</h1><h1 dir='ltr'>No internet connection</h1>", { headers: { "Content-Type": "text/html; charset=utf-8" } })
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

// ---------- الإشعارات ----------
self.addEventListener("push", (event) => {
  let msg = { title: "تلاوات الشيخ ياسر الدوسري", body: "", url: "/" };
  try {
    msg = { ...msg, ...event.data.json() };
  } catch {
    /* إشعار من غير بيانات */
  }
  event.waitUntil(
    self.registration.showNotification(msg.title, {
      body: msg.body,
      icon: "/icons/icon-192.png",
      // أندرويد بيعرض الأيقونة دي بلون واحد في شريط الحالة: لازم شكل أبيض على خلفية شفافة
      badge: "/icons/badge-96.png",
      // صورة كبيرة لما الإشعار يتفتح (بتلفت النظر أكتر من الأيقونة لوحدها)
      ...(msg.image && { image: msg.image }),
      // هزّة قصيرة مرتين: الأندرويد بيعتبر الإشعار أهم، وبيلفت الانتباه حتى لو الموبايل صامت
      vibrate: [200, 100, 200],
      silent: false,
      timestamp: Date.now(),
      dir: "rtl",
      lang: "ar",
      data: { url: msg.url || "/" },
    }),
  );
});

// الضغط على الإشعار: لو الموقع مفتوح بنروح للصفحة فيه، وإلا بنفتحه
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  // رابط برّه الموقع (البث المباشر على يوتيوب): يفتح في نافذة جديدة على طول
  if (new URL(url).origin !== self.location.origin) {
    event.waitUntil(self.clients.openWindow(url));
    return;
  }
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const win = wins.find((w) => new URL(w.url).origin === self.location.origin);
      if (win) {
        await win.focus();
        return win.navigate(url);
      }
      return self.clients.openWindow(url);
    })(),
  );
});
