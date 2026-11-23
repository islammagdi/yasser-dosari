# موقع الشيخ ياسر الدوسري — Frontend

Next.js 14 (App Router) + TypeScript + Tailwind. الواجهة عربي RTL بالكامل.

## التشغيل

```bash
npm install
cp .env.example .env.local   # اختياري: حط رابط mp3 في NEXT_PUBLIC_DEMO_AUDIO_URL عشان تجرب المشغّل
npm run dev                   # http://localhost:3000
```

## الصفحات

| المسار | المحتوى |
|---|---|
| `/` | التعريف بالشيخ + أحدث ٣ تسجيلات من كل قسم |
| `/lectures` | المحاضرات |
| `/fard` | الصلوات المفروضة (الفجر، المغرب، العشاء) |
| `/taraweeh` | التراويح مرقّمة بالليالي + فلتر بسنة رمضان |

## الهيكل

```
src/
  app/                  الصفحات (Server Components)
  components/
    PlayerProvider.tsx  حالة المشغّل كلها: القايمة، التشغيل، التقديم، السرعة، الحفظ في localStorage، Media Session
    PlayerBar.tsx       المشغّل الثابت تحت الصفحة
    RecordingList.tsx   القايمة + البحث + فلتر السنة
  lib/api/
    repository.ts       الـ interface اللي كل الصفحات بتتكلم معاه
    mock.ts             بيانات تجريبية (الافتراضي)
    http.ts             جاهز للـ backend
  types/index.ts        شكل الـ Recording
  data/mock.ts          البيانات التجريبية (كل اللي بين [ ] placeholder)
```

## ربط الـ backend

الصفحات مش عارفة البيانات جاية منين. كل اللي محتاجه إنك تحط `NEXT_PUBLIC_API_URL` في `.env.local`،
والموقع هيتحوّل تلقائيًا من الـ mock لـ `http.ts`. الـ endpoints المتوقعة:

```
GET /recordings?category=lectures|fard|taraweeh&limit=3   → Recording[]
GET /recordings/:id                                       → Recording
```

وشكل الـ `Recording` موجود في `src/types/index.ts`.

## قبل النشر

- حط `NEXT_PUBLIC_SITE_URL=https://دومينك` عشان صور المشاركة على السوشيال ميديا تشتغل صح.
- بدّل `[صورة الشيخ]` في `src/app/page.tsx` بصورة حقيقية (يُفضّل `next/image`).

## النسخة الإنجليزي

- كل الصفحات تحت `src/app/[lang]`. الروابط العربي زي ما هي (`/fard`)، والإنجليزي تحت `/en` (`/en/fard`).
  الـ `middleware.ts` بيحوّل العربي داخليًا لـ `/ar/...`، فمفيش ولا رابط قديم اتغيّر.
- الترجمة: `t("النص العربي")` في أي component (من `useL()` في الـ client، أو `pageL(params)` في صفحات السيرفر).
  المفتاح هو النص العربي نفسه، والترجمة في `src/lib/i18n/en.ts`.
- الروابط الداخلية: استخدم `Link` و `useRouter` و `usePathname` من `@/lib/i18n/nav` (مش من next)، عشان يضيفوا `/en` لوحدهم.
- عناوين الفروض والتراويح والخطب والمصحف بتتولّد بالإنجليزي تلقائيًا (`titleEn` في `labels.ts`). عناوين المحاضرات والمقتطفات المكتوبة بإيد بتفضل عربي.
- قارئ المصحف في الإنجليزي بيعرض ترجمة معاني Saheeh International تحت كل آية (من alquran.cloud).
- بعد أي نص جديد: `node scripts/i18n-missing.mjs` بيطلّع النصوص اللي لسه مالهاش ترجمة.

## الإحصائيات (/admin/stats)

- محتاجة Upstash Redis (مجاني): من Vercel ← Storage ← Create Database ← Upstash for Redis، واربطه بالمشروع.
  Vercel بيضيف `KV_REST_API_URL` و `KV_REST_API_TOKEN` لوحده، وبعدها Redeploy.
- بتعدّ: الزوار في اليوم والمتواجدين الآن، الصفحات، مرات تشغيل كل تلاوة، مشاهدات ومشاركات وتحميلات المقتطفات،
  الدول، مصادر الزيارات، الأجهزة، ولغة الموقع (عربي/إنجليزي).
- من غير كوكيز ولا IP: الزائر بيتحسب من بصمة يومية متشفّرة. زيارات الأدمن والبوتات مش بتتحسب.
- الخطة المجانية فيها ٥٠٠ ألف أمر في الشهر، والزيارة الواحدة حوالي ١٠ أوامر، يعني يكفي ~١٥٠٠ صفحة في اليوم.
