// Service worker بسيط: وجوده بيخلي المتصفح يعتبر الموقع تطبيق قابل للتثبيت.
// مش بيعمل cache لأي حاجة، فكل الطلبات بتروح للسيرفر عادي ومفيش خطر إن الزوار يشوفوا نسخة قديمة.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});