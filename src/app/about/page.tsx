import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "عن الموقع",
  description: "موقع تطوعي غير رسمي لتلاوات الشيخ ياسر الدوسري: المصادر وسياسة الخصوصية.",
};

/** بريد التواصل اللي يظهر في الصفحة */
const CONTACT_EMAIL = "imagdi.swe@gmail.com";

const SOURCES = [
  {
    name: "MP3Quran",
    href: "https://www.mp3quran.net",
    what: "المصحف المرتل بصيغة صوتية، عن طريق واجهتهم البرمجية العامة.",
  },
  {
    name: "قناة «تلاوات ياسر الدوسري إمام الحرم المكي» على يوتيوب",
    href: "https://www.youtube.com/@telawatyasseer1",
    what: "تلاوات الصلوات المفروضة وصلاة التراويح والخطب، تُعرض بمشغّل يوتيوب الرسمي.",
  },
  {
    name: "المركز السعودي للتلاوات القرآنية والأحاديث النبوية",
    href: "https://www.youtube.com/playlist?list=PLbi9UdPlMRS635t0pMgYJARJGYu4BAhe8",
    what: "المصحف المرتل (نسخة الفيديو)، يُعرض بمشغّل يوتيوب الرسمي.",
  },
  {
    name: "Al Quran Cloud",
    href: "https://alquran.cloud",
    what: "نص القرآن الكريم بالرسم العثماني، والتفسير الميسر (مجمع الملك فهد لطباعة المصحف الشريف).",
  },
  {
    name: "موسوعة القرآن الكريم (عبر مكتبة quran-json)",
    href: "https://quranenc.com",
    what: "نص القرآن المستخدم في البحث داخل الآيات.",
  },
  {
    name: "رئاسة الشؤون الدينيةبالمسجد الحرام والمسجد النبوي",
    href: "https://x.com/PRAGOVSA",
    what: "جدول إمامة الشيخ في المسجد الحرام كما يُعلن أسبوعيًا.",
  },
  {
    name: "Aladhan",
    href: "https://aladhan.com",
    what: "مواقيت الصلاة في مكة المكرمة بتقويم أم القرى.",
  },
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-28 flex-col gap-4">
      <h2 id={`${id}-title`} className="font-display text-3xl font-bold text-gold-soft">
        {title}
      </h2>
      <div className="flex flex-col gap-4 text-[17px] leading-9 text-text/90">{children}</div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <>
      <div aria-hidden className="pattern-stars page-pattern" />
      <article className="mx-auto flex max-w-3xl flex-col gap-14">
        <header className="flex flex-col gap-4">
          <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">عن الموقع</h1>
          <p className="text-lg leading-9 text-muted">
            موقع تطوعي يجمع تلاوات الشيخ ياسر الدوسري في مكان واحد: الصلوات المفروضة من المسجد الحرام، والمصحف
            المرتل، وليالي التراويح، والخطب، مع موعد إمامته القادمة.
          </p>
        </header>

        <div className="glass-card flex flex-col gap-2 rounded-3xl p-6">
          <p className="font-semibold">هذا موقع غير رسمي.</p>
          <p className="leading-8 text-muted">
            لا يتبع الموقع للشيخ ياسر الدوسري، ولا لرئاسة الشؤون الدينية، ولا لأي جهة رسمية. الموقع الرسمي للشيخ هو{" "}
            <a href="https://yaldosry.com" target="_blank" rel="noopener noreferrer" className="text-gold-soft underline underline-offset-4">
              yaldosry.com
            </a>
            .
          </p>
        </div>

        <Section id="sources" title="المصادر">
          <p>كل التلاوات مملوكة لأصحابها، ونعرضها من مصادرها مباشرة دون نسخ أو تعديل:</p>
          <ul className="flex flex-col gap-3">
            {SOURCES.map((s) => (
              <li key={s.href} className="glass-card flex flex-col gap-1 rounded-2xl px-5 py-4">
                <a href={s.href} target="_blank" rel="noopener noreferrer" className="font-semibold text-gold-soft underline-offset-4 hover:underline">
                  {s.name}
                </a>
                <span className="text-[15px] leading-7 text-muted">{s.what}</span>
              </li>
            ))}
          </ul>
          <p className="text-[15px] text-muted">
            الصور المستخدمة في الموقع لأصحابها. إن كنت صاحب محتوى وتريد تعديله أو إزالته، راسلنا وسنستجيب في أقرب وقت.
          </p>
        </Section>

        <Section id="privacy" title="سياسة الخصوصية">
          <p>
            <strong>لا نجمع بياناتك الشخصية.</strong> لا يوجد في الموقع تسجيل دخول ولا نماذج، ولا نبيع أو نشارك أي بيانات.
          </p>
          <p>
            <strong>ما يُحفظ على جهازك فقط:</strong> قائمة المفضلة، وآخر تلاوة استمعت إليها والموضع الذي توقفت عنده، وتقدّم الختمة، وآخر سورة قرأتها والعلامة التي وضعتها وحجم خط القراءة. تُحفظ
            هذه البيانات في متصفحك (localStorage)، ولا تصل إلينا، ويمكنك حذفها بمسح بيانات الموقع من المتصفح.
          </p>
          <p>
            <strong>خدمات يوتيوب:</strong> يستخدم الموقع خدمات واجهة برمجة تطبيقات يوتيوب (YouTube API Services) لعرض
            التلاوات المصوّرة. عند تشغيل تلاوة من يوتيوب، يتعامل يوتيوب مع ذلك وفق{" "}
            <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" className="text-gold-soft underline underline-offset-4">
              شروط خدمة يوتيوب
            </a>{" "}
            و
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-gold-soft underline underline-offset-4">
              سياسة خصوصية Google
            </a>
            ، وقد يضع ملفات تعريف الارتباط (Cookies) الخاصة به. باستخدامك هذه التلاوات فأنت توافق على شروط خدمة يوتيوب.
          </p>
          <p>
            <strong>المصادر الخارجية:</strong> عند تشغيل تلاوة صوتية، يُحمَّل الملف مباشرة من خوادم مصدرها (مثل MP3Quran)،
            فيصلها عنوان IP الخاص بك كأي موقع تزوره.
          </p>
          <p>
            <strong>الاستضافة:</strong> الموقع مستضاف على Vercel، التي قد تحتفظ بسجلات تقنية مؤقتة (مثل عنوان IP ووقت
            الزيارة) لتشغيل الخدمة وحمايتها.
          </p>
          <p className="text-[15px] text-muted">آخر تحديث: نوفمبر ٢٠٢٦</p>
        </Section>

        <Section id="contact" title="التواصل">
          <p>
            لأي ملاحظة أو اقتراح أو طلب تعديل: <span className="text-gold-soft">{CONTACT_EMAIL}</span>
          </p>
        </Section>

        <Link
          href="/"
          className="self-start rounded-full bg-gold px-6 py-3 font-semibold text-gold-ink transition-colors hover:bg-gold-soft"
        >
          العودة إلى الرئيسية
        </Link>
      </article>
    </>
  );
}