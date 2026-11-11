import { loadCatalog } from "@/lib/admin/catalog";
import { loadDaily } from "@/lib/admin/daily";
import { loadImamateDoc } from "@/lib/admin/imamateStore";
import { adminManifest } from "@/lib/admin/manifest";
import { listKeys, r2Enabled } from "@/lib/admin/r2";
import { recordings } from "@/lib/api";
import { fetchMushaf } from "@/lib/api/mp3quran";
import { makkahPrayerTimes } from "@/lib/api/prayerTimes";
import { fetchYoutubeMushaf } from "@/lib/api/youtube";
import { makkahToday } from "@/lib/imamate";
import { countSubscriptions } from "@/lib/push/server";

// الفحوصات بتكلّم يوتيوب و R2 وغيرهم، فممكن تاخد ثواني
export const maxDuration = 60;

type Level = "ok" | "warn" | "error";
interface Check {
  title: string;
  level: Level;
  message: string;
  details?: string[];
}

/** بيشغّل الفحص، ولو رمى خطأ بيبقى "error" برسالة الخطأ */
async function run(title: string, fn: () => Promise<Omit<Check, "title">>): Promise<Check> {
  try {
    return { title, ...(await fn()) };
  } catch (err) {
    return { title, level: "error", message: err instanceof Error ? err.message : String(err) };
  }
}

const n = (x: number) => x.toLocaleString("ar-EG");

export default async function AdminStatusPage() {
  const startedAt = Date.now();
  const audioBase = process.env.AUDIO_BASE_URL ?? "";

  const checks = await Promise.all([
    run("التخزين (R2)", async () => {
      if (!r2Enabled()) return { level: "error", message: "متغيرات R2_* ناقصة على Vercel، فاللوحة مش هتقدر تحفظ أي حاجة." };
      const keys = await listKeys("admin/");
      return { level: "ok", message: `متصل، وفيه ${n(keys.length)} ملف إعدادات.` };
    }),

    run("الكتالوج والتسجيلات", async () => {
      const [catalog, manifest] = await Promise.all([loadCatalog(), adminManifest()]);
      if (!catalog) return { level: "warn", message: "الكتالوج لسه متعملش، والموقع بيعرض من بلاي ليستات يوتيوب." };
      const entries = Object.entries(catalog.items);
      const visible = entries.filter(([, e]) => !e.hidden);
      const byCat: Record<string, number> = {};
      for (const [, e] of visible) byCat[e.category] = (byCat[e.category] ?? 0) + 1;
      const noAudio = visible.filter(([id]) => !manifest[id]).length;
      const pending = Object.keys(manifest).filter((id) => !catalog.items[id]).length;
      return {
        level: pending > 0 ? "warn" : "ok",
        message: `${n(visible.length)} تسجيل ظاهر، و${n(entries.length - visible.length)} مخفي.${pending ? ` فيه ${n(pending)} بانتظار التصنيف.` : ""}`,
        details: [
          `الفروض: ${n(byCat.fard ?? 0)} · التراويح: ${n(byCat.taraweeh ?? 0)} · الخطب: ${n(byCat.lectures ?? 0)} · النادرة: ${n(byCat.rare ?? 0)}`,
          `ملفات الصوت في الفهرس: ${n(Object.keys(manifest).length)}`,
          `تسجيلات لسه فيديو (ملهاش ملف صوت): ${n(noAudio)}`,
          `آخر تعديل للكتالوج: ${new Date(catalog.updatedAt).toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })}`,
        ],
      };
    }),

    run("ملفات الصوت للزوار", async () => {
      if (!audioBase) return { level: "warn", message: "AUDIO_BASE_URL فاضي، فكل التسجيلات بتتشغّل من يوتيوب." };
      const res = await fetch(`${audioBase.replace(/\/$/, "")}/manifest.json`, { cache: "no-store" });
      if (!res.ok) return { level: "error", message: `الفهرس العام مش بيفتح (${res.status}). الزوار هيشوفوا فيديو بدل الصوت.` };
      const devUrl = audioBase.includes(".r2.dev");
      return {
        level: devUrl ? "warn" : "ok",
        message: devUrl ? "شغال، بس من رابط r2.dev التجريبي، وده عليه حد للسرعة. اربطه بدومين قبل ما الزيارات تزيد." : "شغال من الدومين الخاص.",
        details: [audioBase],
      };
    }),

    run("يوتيوب", async () => {
      const key = process.env.YOUTUBE_API_KEY;
      if (!key) return { level: "error", message: "YOUTUBE_API_KEY مش موجود." };
      const channel = process.env.YOUTUBE_CHANNEL_ID ?? "UClncV9OLPto_MinRzGfjr2g";
      const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=id&id=${channel}&key=${key}`, { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const reason = body?.error?.errors?.[0]?.reason ?? body?.error?.message ?? res.status;
        return {
          level: "error",
          message: reason === "quotaExceeded" ? "حصة يوتيوب اليومية خلصت. بترجع بعد منتصف الليل بتوقيت المحيط الهادي." : `المفتاح مش شغال: ${reason}`,
        };
      }
      const mushaf = await fetchYoutubeMushaf();
      const asAudio = mushaf.filter((r) => !r.youtubeId).length;
      return { level: "ok", message: "المفتاح شغال.", details: [`المصحف (المركز السعودي): ${n(mushaf.length)} سورة، منها ${n(asAudio)} صوت`] };
    }),

    run("المصحف (mp3quran)", async () => {
      const list = await fetchMushaf();
      return list.length >= 114
        ? { level: "ok", message: `${n(list.length)} سورة متاحة.` }
        : { level: "warn", message: `متاح ${n(list.length)} سورة بس من ١١٤.` };
    }),

    run("جدول الإمامة", async () => {
      const [doc, slots] = await Promise.all([loadImamateDoc(), recordings.imamate()]);
      const today = makkahToday(new Date());
      const upcoming = slots.filter((s) => s.date >= today);
      const source = doc ? "من لوحة التحكم" : "من Google Sheet (لسه ما اتنقلش للوحة)";
      if (!upcoming.length)
        return { level: "warn", message: "مفيش مواعيد إمامة جاية في الجدول. لو الجدول الجديد اتعلن، ضيفه من «جدول الإمامة».", details: [source] };
      const last = upcoming[upcoming.length - 1].date;
      return { level: doc ? "ok" : "warn", message: `${n(upcoming.length)} موعد جاي، لحد ${last}.`, details: [source] };
    }),

    run("مواقيت الصلاة (Aladhan)", async () => {
      const times = await makkahPrayerTimes([makkahToday(new Date())]);
      return Object.keys(times).length ? { level: "ok", message: "شغالة." } : { level: "warn", message: "ما رجعتش مواقيت، فالمواعيد هتظهر من غير ساعة." };
    }),

    run("تلاوة اليوم", async () => {
      const daily = await loadDaily();
      const size = daily?.pool.length ?? 0;
      return size
        ? { level: size < 7 ? "warn" : "ok", message: `في القايمة ${n(size)} تلاوة.${size < 7 ? " ضيف أكتر علشان التلاوة ما تتكررش كتير." : ""}` }
        : { level: "warn", message: "القايمة فاضية، فكارت «تلاوة اليوم» مش ظاهر في الرئيسية." };
    }),

    run("الإشعارات", async () => {
      if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY)
        return { level: "error", message: "مفاتيح VAPID ناقصة على Vercel، فالإشعارات مش هتشتغل." };
      return { level: "ok", message: `مفعّلة، وعدد المشتركين ${n(await countSubscriptions())}.` };
    }),

    run("إعدادات عامة", async () => {
      const problems: string[] = [];
      if ((process.env.ADMIN_PASSWORD ?? "").length < 16) problems.push("باسورد اللوحة أقصر من ١٦ حرف.");
      if (!process.env.NEXT_PUBLIC_SITE_URL) problems.push("NEXT_PUBLIC_SITE_URL مش متظبط، فروابط المشاركة وخريطة الموقع ممكن تبقى غلط.");
      return problems.length ? { level: "warn", message: "فيه حاجات تستاهل تتظبط.", details: problems } : { level: "ok", message: "تمام." };
    }),
  ]);

  const counts = { ok: 0, warn: 0, error: 0 };
  for (const c of checks) counts[c.level]++;
  const icon = { ok: "✓", warn: "!", error: "✕" };
  const color = { ok: "text-[#6FCF97] border-[#6FCF97]/40", warn: "text-gold border-gold/50", error: "text-[#E5636B] border-[#E5636B]/50" };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-4xl font-bold">حالة الموقع</h1>
        <p className="text-muted">
          {counts.error ? `${counts.error} مشكلة تحتاج حل` : counts.warn ? "كل حاجة شغالة، وفيه ملاحظات" : "كل حاجة شغالة"} · الفحص خد{" "}
          {((Date.now() - startedAt) / 1000).toFixed(1)} ثانية · اعمل refresh للصفحة علشان تفحص تاني
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {checks.map((c) => (
          <li key={c.title} className="glass-card flex gap-4 rounded-2xl p-4">
            <span aria-hidden className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-lg font-bold ${color[c.level]}`}>
              {icon[c.level]}
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <p className="font-semibold">
                {c.title}
                <span className="sr-only"> ({c.level === "ok" ? "سليم" : c.level === "warn" ? "تنبيه" : "مشكلة"})</span>
              </p>
              <p className="text-sm leading-6 text-muted">{c.message}</p>
              {c.details?.map((d) => (
                <p key={d} dir="auto" className="break-all text-xs leading-5 text-muted/80">
                  {d}
                </p>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
