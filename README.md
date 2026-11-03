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
