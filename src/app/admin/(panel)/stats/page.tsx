import Link from "next/link";
import { loadStats, type Ranked } from "@/lib/stats/read";
import { toArabicDigits } from "@/lib/format";

export const dynamic = "force-dynamic";

const RANGES = [
  { days: 1, label: "النهارده" },
  { days: 7, label: "٧ أيام" },
  { days: 30, label: "٣٠ يوم" },
  { days: 90, label: "٩٠ يوم" },
];

const EVENT_LABELS: [string, string][] = [
  ["share", "مشاركة تلاوة"],
  ["clip_share", "مشاركة مقطع"],
  ["clip_download", "تحميل مقطع"],
  ["save_offline", "حفظ للاستماع بدون إنترنت"],
  ["install", "تثبيت الموقع كتطبيق"],
  ["push_subscribe", "اشتراك في الإشعارات"],
];

const n = (v: number) => toArabicDigits(v);
const shortDay = (d: string) => new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(d));

export default async function StatsPage({ searchParams }: { searchParams: { r?: string } }) {
  const range = RANGES.find((r) => String(r.days) === searchParams.r)?.days ?? 30;
  let s: Awaited<ReturnType<typeof loadStats>> = null;
  let failed = false;
  try {
    s = await loadStats(range);
  } catch (e) {
    console.error(e);
    failed = true;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-4xl font-bold">الإحصائيات</h1>
          <p className="text-sm text-muted">من غير أي بيانات شخصية. زياراتك وانت داخل اللوحة مش بتتحسب.</p>
        </div>
        <nav aria-label="المدة" className="flex flex-wrap gap-2">
          {RANGES.map((r) => (
            <Link
              key={r.days}
              href={`/admin/stats?r=${r.days}`}
              aria-current={r.days === range ? "page" : undefined}
              className={`min-h-10 rounded-full border px-4 py-2 text-sm font-semibold ${
                r.days === range ? "border-accent bg-accent text-[#fff] dark:text-accent-ink" : "border-line-strong text-gold-soft hover:border-gold/50"
              }`}
            >
              {r.label}
            </Link>
          ))}
        </nav>
      </div>

      {failed && <p className="rounded-2xl border border-[#E5636B]/50 p-4 text-sm">تعذّر الاتصال بقاعدة الإحصائيات دلوقتي. جرّب تاني بعد شوية.</p>}
      {!s && !failed && <Setup />}

      {s && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Tile label="متواجدين الآن" value={n(s.online)} hint="آخر ٥ دقايق" live />
            <Tile label="الزوار" value={n(s.totals.visitors)} hint={change(s.totals.visitors, s.prevVisitors, range)} />
            <Tile label="الصفحات" value={n(s.totals.pageviews)} hint={s.totals.visitors ? `${toArabicDigits(Math.round((s.totals.pageviews / s.totals.visitors) * 10) / 10)} صفحة لكل زائر` : undefined} />
            <Tile label="مرات التشغيل" value={n(s.totals.plays)} hint="تلاوات اتسمعت" />
            <Tile label="مشاهدات المقتطفات" value={n(s.totals.clipViews)} />
          </div>

          {range > 1 && (
            <div className="grid gap-3 lg:grid-cols-2">
              <Bars title="الزوار في اليوم" days={s.days} values={s.visitors} unit="زائر" />
              <Bars title="مرات التشغيل في اليوم" days={s.days} values={s.plays} unit="تشغيل" />
            </div>
          )}

          <div className="grid gap-3 lg:grid-cols-2">
            <List title="أكتر الصفحات زيارة" items={s.pages} unit="زيارة" link />
            <List title="أكتر التلاوات تشغيلًا" items={s.recordings} unit="تشغيل" />
            <List title="أكتر المقتطفات مشاهدة" items={s.clips} unit="مشاهدة" />
            <List title="الزوار جايين منين" items={s.referrers} unit="زيارة" />
            <List title="الدول" items={s.countries} unit="زيارة" />
            <div className="flex flex-col gap-3">
              <List title="الأجهزة" items={s.devices} unit="زيارة" />
              <List title="لغة الموقع" items={s.langs} unit="زيارة" />
            </div>
          </div>

          <section className="glass-card flex flex-col gap-3 rounded-3xl p-5">
            <h2 className="font-display text-2xl font-bold">تفاعل الزوار</h2>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {EVENT_LABELS.map(([k, label]) => (
                <div key={k} className="flex flex-col gap-0.5 rounded-2xl border border-line p-3">
                  <dt className="text-sm text-muted">{label}</dt>
                  <dd className="font-display text-2xl font-bold tabular-nums">{n(s.events[k] ?? 0)}</dd>
                </div>
              ))}
            </dl>
          </section>
        </>
      )}
    </div>
  );
}

function change(cur: number, prev: number, range: number): string | undefined {
  if (!prev) return undefined;
  const pct = Math.round(((cur - prev) / prev) * 100);
  const span = range === 1 ? "إمبارح" : `الـ${toArabicDigits(range)} يوم اللي قبلها`;
  if (pct === 0) return `زي ${span}`;
  return `${pct > 0 ? "▲" : "▼"} ${toArabicDigits(Math.abs(pct))}٪ عن ${span}`;
}

function Tile({ label, value, hint, live }: { label: string; value: string; hint?: string; live?: boolean }) {
  return (
    <div className="glass-card flex flex-col gap-1 rounded-3xl p-5">
      <span className="flex items-center gap-2 text-sm text-muted">
        {live && <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-[#2FA36B]" />}
        {label}
      </span>
      <span className="font-display text-4xl font-bold tabular-nums">{value}</span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}

/** عمود لكل يوم، والأقدم على اليمين زي اتجاه القراءة. التفاصيل بتظهر لما تقف على العمود */
function Bars({ title, days, values, unit }: { title: string; days: string[]; values: number[]; unit: string }) {
  const max = Math.max(1, ...values);
  const total = values.reduce((a, b) => a + b, 0);
  const ticks = [0, Math.floor((days.length - 1) / 2), days.length - 1];
  return (
    <section className="glass-card flex flex-col gap-4 rounded-3xl p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl font-bold">{title}</h2>
        <span className="text-sm text-muted">أعلى يوم: {n(max === 1 && total === 0 ? 0 : max)}</span>
      </div>
      <div className="relative h-44 border-b border-line" role="img" aria-label={`${title}: ${days.map((d, i) => `${shortDay(d)} ${values[i]}`).join("، ")}`}>
        <div aria-hidden className="absolute inset-x-0 top-0 border-t border-dashed border-line" />
        <div aria-hidden className="absolute inset-x-0 top-1/2 border-t border-dashed border-line" />
        <div className="relative flex h-full items-end gap-[2px]">
          {values.map((v, i) => (
            <div key={days[i]} className="group relative flex h-full flex-1 items-end">
              <div
                className="w-full rounded-t-[4px] bg-accent transition-opacity group-hover:opacity-80 dark:bg-gold"
                style={{ height: `${(v / max) * 100}%`, minHeight: v ? 2 : 0 }}
              />
              <div className="pointer-events-none absolute bottom-full start-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs shadow-float group-hover:block rtl:translate-x-1/2">
                <div className="text-muted">{shortDay(days[i])}</div>
                <div className="font-semibold tabular-nums">
                  {n(v)} {unit}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-between text-xs text-muted">
        {ticks.map((t) => (
          <span key={t}>{shortDay(days[t])}</span>
        ))}
      </div>
    </section>
  );
}

function List({ title, items, unit, link }: { title: string; items: Ranked[]; unit: string; link?: boolean }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <section className="glass-card flex flex-col gap-3 rounded-3xl p-5">
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted">لسه مفيش بيانات في المدة دي.</p>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {items.map((it) => (
            <li key={it.key} className="relative flex items-center justify-between gap-3 overflow-hidden rounded-xl px-3 py-2 text-sm">
              <span aria-hidden className="absolute inset-y-0 start-0 rounded-xl bg-accent/10 dark:bg-gold/10" style={{ width: `${(it.count / max) * 100}%` }} />
              {link ? (
                <a href={it.key} target="_blank" rel="noreferrer" className="relative min-w-0 truncate hover:underline" title={it.key}>
                  {it.label}
                </a>
              ) : (
                <span className="relative min-w-0 truncate" title={it.key}>
                  {it.label}
                </span>
              )}
              <span className="relative shrink-0 tabular-nums text-muted">
                {n(it.count)} <span className="sr-only">{unit}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Setup() {
  return (
    <section className="glass-card flex flex-col gap-3 rounded-3xl p-6 text-[15px] leading-8">
      <h2 className="font-display text-2xl font-bold">الإحصائيات محتاجة تفعيل مرة واحدة</h2>
      <ol className="list-decimal ps-6">
        <li>
          من Vercel افتح المشروع ← <b>Storage</b> ← <b>Create Database</b> ← اختار <b>Upstash for Redis</b> (الخطة المجانية).
        </li>
        <li>اربطه بالمشروع، وVercel هيضيف المتغيرات KV_REST_API_URL و KV_REST_API_TOKEN لوحده.</li>
        <li>اعمل Redeploy، وارجع للصفحة دي. الأرقام بتبدأ تتجمع من أول زيارة بعدها.</li>
      </ol>
    </section>
  );
}
