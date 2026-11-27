"use client";

import { useL } from "@/lib/i18n/client";
import type { L } from "@/lib/i18n";
import { useEffect, useState } from "react";
import type { Recording } from "@/types";
import { siteUrl } from "@/lib/site";
import { canSaveOffline, saveOffline, useOffline } from "@/lib/offline";
import { disableWirdReminder, enableWirdReminder, wirdReminderTime } from "@/lib/push/client";
import { khatmaCountLabel } from "@/lib/useKhatma";
import { useWird } from "@/lib/useWird";
import { localToday, wirdGoogleUrl, wirdIcs } from "@/lib/wird";
import { WIRD_JUZ_DURATIONS, type WirdPortion } from "@/lib/wirdJuz";
import { usePlayer } from "./PlayerProvider";
import { ClockIcon, PlayIcon } from "./icons";
import { ask } from "@/lib/confirm";

const DISMISS_KEY = "yd-wird-dismissed";

const durationLabel = (d: number, { t, toArabicDigits }: L) =>
  d === 7 ? t("أسبوع") : d === 10 ? t("١٠ أيام") : d === 30 ? t("شهر") : d === 60 ? t("شهرين") : t("{n} يومًا", { n: toArabicDigits(d) });

const EDITION_KEY = "yd-wird-edition";
const MURATTAL = "المصحف المرتل";
const editionOf = (r: Recording) => r.versionLabel || MURATTAL;

/**
 * طابور ورد اليوم: كل سورة في النصيب كتسجيل، والسور الناقصة (أول وآخر النصيب) كمقطع
 * من وقت أول آية لآخر آية، من توقيت الآيات بتاع mp3quran. لو التوقيت مش متاح بنشغّل السورة كاملة.
 */
async function buildQueue(portion: WirdPortion, bySurah: Map<number, Recording>): Promise<Recording[]> {
  const out: Recording[] = [];
  const last = portion.segments.length - 1;
  for (const [i, seg] of portion.segments.entries()) {
    const rec = bySurah.get(seg.surah);
    if (!rec) continue;
    const tag = i === last ? `wird-${portion.index}-end` : `wird-${portion.index}-${i}`;
    // توقيت الآيات من mp3quran بيطابق ملفاتهم بس: أي نسخة تانية بتتشغّل بالسورة كاملة
    if (seg.whole || rec.youtubeId || !rec.audioUrl || !rec.id.startsWith("mushaf-")) {
      out.push({ ...rec, clip: { start: 0, tag } });
      continue;
    }
    try {
      const res = await fetch(`/api/ayahs/${seg.surah}`);
      const { timings } = (await res.json()) as { timings?: { ayah: number; start: number; end: number }[] };
      const from = timings?.find((t) => t.ayah === seg.from);
      const to = timings?.find((t) => t.ayah === seg.to);
      const isLastAyah = !timings?.some((t) => t.ayah > seg.to);
      out.push({ ...rec, clip: { start: from ? from.start / 1000 : 0, end: to && !isLastAyah ? to.end / 1000 : undefined, tag } });
    } catch {
      out.push({ ...rec, clip: { start: 0, tag } });
    }
  }
  return out;
}

/**
 * الورد اليومي: لو مفيش خطة بيعرض اختيار المدة، ولو فيه بيعرض سور النهارده وزرار تشغيلها.
 * items = تسجيلات المصحف (الصوت قبل الفيديو).
 * dismissible = في الرئيسية: الزائر يقدر يخفي الدعوة لو مش مهتم.
 */
export function WirdCard({ items, dismissible = false }: { items: Recording[]; dismissible?: boolean }) {
  const l = useL();
  const { t, toArabicDigits, dailyAmountLabel, portionLabel, portionRange, en, surahTitle } = l;
  const w = useWird();
  const p = usePlayer();
  const [dismissed, setDismissed] = useState(true);
  const [time, setTime] = useState("20:00");
  const off = useOffline();
  // تذكير الورد بإشعار على الجهاز
  const [pushTime, setPushTime] = useState<string | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMsg, setPushMsg] = useState("");
  useEffect(() => setPushTime(wirdReminderTime()), []);
  const [saving, setSaving] = useState<string | null>(null);
  const [loadingQueue, setLoadingQueue] = useState(false);
  // نسخة المصحف اللي الزائر بيسمع منها الورد (محفوظة على جهازه)
  const [edition, setEditionState] = useState<string | null>(null);
  useEffect(() => {
    try {
      setEditionState(localStorage.getItem(EDITION_KEY));
    } catch {
      /* تجاهل */
    }
  }, []);
  const setEdition = (v: string) => {
    setEditionState(v);
    try {
      localStorage.setItem(EDITION_KEY, v);
    } catch {
      /* تجاهل */
    }
  };

  // آخر مقطع في ورد اليوم خلص في المشغّل: الورد بيتعلّم لوحده
  const portionIndex = w.portion?.index;
  const markDone = w.markDone;
  useEffect(() => {
    if (portionIndex === undefined) return;
    const onEnd = (e: Event) => {
      if ((e as CustomEvent<string>).detail === `wird-${portionIndex}-end`) markDone();
    };
    window.addEventListener("yd-clip-ended", onEnd);
    return () => window.removeEventListener("yd-clip-ended", onEnd);
  }, [portionIndex, markDone]);

  useEffect(() => {
    try {
      setDismissed(dismissible && localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, [dismissible]);

  if (!w.ready) return null;

  // النسخ المتاحة (المرتل الأول)، والنسخة المختارة لو لسه موجودة
  const editions = [...new Set(items.map(editionOf))].sort((a, b) => Number(b === MURATTAL) - Number(a === MURATTAL));
  const chosen = edition && editions.includes(edition) ? edition : editions[0];

  // تسجيل لكل سورة من النسخة المختارة، ولو السورة ناقصة فيها ناخدها من أي نسخة تانية (الصوت قبل الفيديو)
  const bySurah = new Map<number, Recording>();
  const ordered = [...items].sort(
    (a, b) => Number(editionOf(b) === chosen) - Number(editionOf(a) === chosen) || Number(!!a.youtubeId) - Number(!!b.youtubeId),
  );
  for (const r of ordered) if (r.surah && !bySurah.has(r.surah)) bySurah.set(r.surah, r);

  const editionPicker =
    editions.length > 1 ? (
      <div className="flex flex-wrap items-center gap-2 text-sm" role="radiogroup" aria-label={t("المصحف")}>
        <span className="text-muted">{t("بتسمع من:")}</span>
        {editions.map((e) => (
          <button
            key={e}
            type="button"
            role="radio"
            aria-checked={e === chosen}
            onClick={() => setEdition(e)}
            className={`min-h-9 rounded-full px-3.5 font-semibold transition-colors ${
              e === chosen ? "bg-accent text-accent-ink" : "border border-line-strong text-muted hover:text-text"
            }`}
          >
            {t(e)}
          </button>
        ))}
      </div>
    ) : null;

  const durations = (onPick: (d: number) => void) => (
    <div className="flex flex-wrap gap-2">
      {WIRD_JUZ_DURATIONS.map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onPick(d)}
          className="flex min-h-12 flex-col items-center justify-center rounded-2xl border border-line-strong px-4 py-1.5 transition-colors hover:border-gold/60 hover:bg-gold/10"
        >
          <span className="text-[15px] font-semibold text-gold-soft">{durationLabel(d, l)}</span>
          <span className="text-xs text-muted">{dailyAmountLabel(d)}</span>
        </button>
      ))}
    </div>
  );

  // عرض ختمة رمضان: قبل رمضان بخمس شهور أو أقل، أو في رمضان نفسه
  const ro = w.ramadanOffer;
  const ramadanOffer =
    ro && ro.daysUntil <= 150 ? (
      <div className="flex flex-col gap-3 rounded-2xl bg-gradient-to-l ltr:bg-gradient-to-r from-[#1E4A3C] to-[#10241D] p-4 text-[#F1EEE6] sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-display text-xl font-bold">{t("ختمة رمضان")} {toArabicDigits(ro.year)}  {t("هـ")}</span>
          <span className="text-sm text-[#C9D2CC]">
            
            {ro.daysUntil > 0
              ? t("جزء كل ليلة، والخطة بتبدأ لوحدها أول يوم في رمضان (بعد {n} يوم).", { n: toArabicDigits(ro.daysUntil) })
              : t("جزء كل ليلة، والخطة بتبدأ لوحدها من أول رمضان.")}
          </span>
        </div>
        <button type="button" onClick={w.startRamadan} className="min-h-11 shrink-0 rounded-full bg-[#CDAA62] px-5 font-semibold text-[#1A1408] hover:bg-[#E7CD94]">
          
          {t("اشترك في ختمة رمضان")}
        </button>
      </div>
    ) : null;

  // ---- مفيش خطة: دعوة ----
  if (!w.plan) {
    if (dismissed) return null;
    return (
      <section id="khatma" aria-labelledby="wird-title" className="scroll-mt-24 glass-card flex flex-col gap-4 rounded-3xl p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 id="wird-title" className="font-display text-2xl font-bold text-gold-soft">
            
            {t("ورد يومي لختم المصحف")}
          </h2>
          <p className="leading-7 text-muted">
            
            {t("اختر مدة الختمة، ونقسّم لك الأجزاء الثلاثين على الأيام، وتسمع وردك كل يوم بصوت الشيخ.")}
          </p>
        </div>
        {ramadanOffer}
        <p className="text-sm font-semibold">{ramadanOffer ? t("أو ابدأ دلوقتي، وأختم المصحف في:") : t("أختم المصحف في:")}</p>
        {durations(w.start)}
        {dismissible && (
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.setItem(DISMISS_KEY, "1");
              } catch {
                /* تجاهل */
              }
              setDismissed(true);
            }}
            className="self-start text-sm text-muted underline-offset-4 hover:text-text hover:underline"
          >
            
            {t("ليس الآن")}
          </button>
        )}
      </section>
    );
  }

  // ---- الختمة خلصت ----
  if (w.finished) {
    return (
      <section id="khatma" aria-labelledby="wird-title" className="scroll-mt-24 glass-card flex flex-col gap-4 rounded-3xl p-5 sm:p-6">
        <h2 id="wird-title" className="font-display text-2xl font-bold text-gold-soft">
          
          {t("أتممت الختمة، تقبّل الله منك")}
        </h2>
        {w.completedKhatmas > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-muted">{t("أتممت حتى الآن {x} بصوت الشيخ.", { x: khatmaCountLabel(w.completedKhatmas, toArabicDigits, en) })}</p>
            <button
              type="button"
              onClick={() => shareKhatma(w.completedKhatmas, l)}
              className="min-h-11 rounded-full border border-line-strong px-4 text-sm font-semibold text-gold-soft hover:border-gold/50"
            >
              
              {t("شارك فرحتك")}
            </button>
          </div>
        )}
        {ramadanOffer}
        <p className="text-sm font-semibold">{t("ابدأ ختمة جديدة في:")}</p>
        {durations(w.restart)}
        <button type="button" onClick={w.stop} className="self-start text-sm text-muted underline-offset-4 hover:text-text hover:underline">
          
          {t("إنهاء الخطة")}
        </button>
      </section>
    );
  }

  // ---- ورد النهارده ----
  const portion = w.portion!;
  const allDone = w.doneToday && w.behind === 0;
  const recs = [...new Map(portion.segments.flatMap((sg) => (bySurah.get(sg.surah) ? [[sg.surah, bySurah.get(sg.surah)!]] : []))).values()];

  const downloadIcs = () => {
    const url = URL.createObjectURL(wirdIcs(localToday(), w.daysLeft, time, siteUrl));
    const a = document.createElement("a");
    a.href = url;
    a.download = "wird.ics";
    a.click();
    URL.revokeObjectURL(url);
  };

  const listen = async () => {
    setLoadingQueue(true);
    try {
      const q = await buildQueue(portion, bySurah);
      if (q.length) p.playQueue(q, 0);
    } finally {
      setLoadingQueue(false);
    }
  };

  return (
    <section id="khatma" aria-labelledby="wird-title" className="scroll-mt-24 glass-card flex flex-col gap-4 rounded-3xl p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="wird-title" className="font-display text-2xl font-bold text-gold-soft">
          {w.upcoming ? t("ختمة رمضان") : allDone ? t("أتممت ورد اليوم") : t("وردك اليوم")}
        </h2>
        {w.streak.current >= 2 && (
          <span className="flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1 text-sm font-semibold text-gold-soft" title={w.streak.best > w.streak.current ? t("أطول سلسلة: {n} يومًا", { n: toArabicDigits(w.streak.best) }) : undefined}>
            <FlameIcon />
            {streakLabel(w.streak.current, l)}
          </span>
        )}
        <span className="text-sm text-muted">
          {w.upcoming
            ? t("ختمة رمضان {y}", { y: toArabicDigits(w.plan.ramadan ?? 0) })
            : t("اليوم {n} من {total}", { n: toArabicDigits(portion.index + 1), total: toArabicDigits(w.plan.days) })}
          {w.behind > 0 &&
            t("، متأخر {n}", { n: w.behind === 1 ? t("يوم") : w.behind === 2 ? t("يومين") : t("{n} أيام", { n: toArabicDigits(w.behind) }) })}
        </span>
      </div>

      {w.upcoming && (
        <p className="rounded-2xl bg-gold/10 px-4 py-3 text-sm leading-6">
          
          {t("ختمتك بتبدأ أول يوم في رمضان، بعد")} {toArabicDigits(w.daysUntil)} {w.daysUntil === 1 ? t("يوم") : w.daysUntil === 2 ? t("يومين") : w.daysUntil <= 10 ? t("أيام") : t("يوم")}  {t("إن شاء الله. وأول ورد هو الجزء الأول، وتقدر تسمعه من دلوقتي لو حابب.")}
        </p>
      )}

      {w.migrated && (
        <div className="flex items-start gap-3 rounded-2xl bg-gold/10 px-4 py-3 text-sm leading-6">
          <p className="flex-1">
            
            {t("الورد بقى بالأجزاء: خطتك بقت")} {dailyAmountLabel(w.plan.days)}  {t("بنفس المدة، وبتبدأ من أول المصحف. وختمتك في صفحة المصحف زي ما هي.")}
          </p>
          <button type="button" onClick={w.dismissMigrated} aria-label={t("إخفاء")} className="-m-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-fg/5 hover:text-text">
            <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <p className="font-display text-xl font-bold">{allDone ? t("الجاي: {x}", { x: portionLabel(portion) }) : portionLabel(portion)}</p>
        <p className="text-sm text-muted">{portionRange(portion)}</p>
      </div>

      {editionPicker}
      {chosen !== MURATTAL && (
        <p className="-mt-2 text-xs text-muted">{t("النسخة دي بتتشغّل بالسورة كاملة، مش من أول آية الجزء بالظبط.")}</p>
      )}

      <ul aria-label={t("سور ورد اليوم")} className="flex flex-wrap gap-2">
        {portion.segments.map((sg) => (
          <li key={sg.surah} className="inline-flex min-h-9 items-center rounded-full bg-fg/5 px-3.5 text-sm">
            
            {surahTitle(sg.surah)}
            {!sg.whole && <span className="ms-1.5 text-xs text-muted">{t("من {a} إلى {b}", { a: toArabicDigits(sg.from), b: toArabicDigits(sg.to) })}</span>}
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-1.5">
        <div
          role="progressbar"
          aria-label={t("تقدّم الختمة")}
          aria-valuemin={0}
          aria-valuemax={w.plan.days}
          aria-valuenow={w.doneCount}
          className="h-1.5 overflow-hidden rounded-full bg-fg/10"
        >
          <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${Math.round((w.doneCount / w.plan.days) * 100)}%` }} />
        </div>
        <p className="text-xs text-muted">
          
          {t("الختمة: {n} من {total} يومًا، {amount}", { n: toArabicDigits(w.doneCount), total: toArabicDigits(w.plan.days), amount: dailyAmountLabel(w.plan.days) })}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {recs.length > 0 && (
          <button
            type="button"
            onClick={listen}
            disabled={loadingQueue}
            className="flex min-h-11 items-center gap-2 rounded-full bg-accent pe-5 ps-2 text-[15px] font-semibold text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-70"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-ink text-accent">
              <PlayIcon className="h-4 w-4" />
            </span>
            {loadingQueue ? t("جارٍ التجهيز…") : w.upcoming ? t("اسمع الجزء الأول بدري") : allDone ? t("اسمع ورد بكرة بدري") : t("استمع لوردك")}
          </button>
        )}
        {!w.upcoming && (
        <button
          type="button"
          onClick={w.markDone}
          className="min-h-11 rounded-full border border-line-strong px-4 text-sm font-semibold text-gold-soft hover:border-gold/50"
        >
          
          {t("✓ أتممت هذا الورد")}
        </button>
        )}

        {/* حفظ سور ورد اليوم كلها للاستماع بدون إنترنت */}
        {recs.some((r) => canSaveOffline(r)) && (
          recs.every((r) => off.isSaved(r.id)) ? (
            <span className="text-sm font-semibold text-gold-soft">{t("✓ ورد اليوم محفوظ بدون إنترنت")}</span>
          ) : (
            <button
              type="button"
              disabled={saving !== null}
              onClick={async () => {
                const todo = recs.filter((r) => canSaveOffline(r) && !off.isSaved(r.id));
                try {
                  for (let i = 0; i < todo.length; i++) {
                    setSaving(t("{n} من {total}", { n: toArabicDigits(i + 1), total: toArabicDigits(todo.length) }));
                    await saveOffline(todo[i]);
                  }
                } catch {
                  window.alert(t("تعذّر حفظ بعض السور الآن. تأكد من الاتصال وحاول مرة أخرى."));
                } finally {
                  setSaving(null);
                }
              }}
              className="min-h-11 rounded-full border border-line-strong px-4 text-sm font-semibold text-gold-soft hover:border-gold/50 disabled:opacity-70"
            >
              {saving ? t("جارٍ الحفظ… {x}", { x: saving }) : t("حفظ ورد اليوم بدون إنترنت")}
            </button>
          )
        )}

        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-line-strong px-4 text-sm font-semibold text-gold-soft transition-colors hover:border-gold/50">
            <ClockIcon className="h-4 w-4" />
            
            {t("ذكّرني يوميًا")}
          </summary>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {pushTime && (
              <p className="w-full text-sm text-gold-soft">{t("✓ يصلك إشعار يوميًا الساعة")} {pushTime}</p>
            )}
            <label className="flex items-center gap-2 text-sm text-muted">
              
              {t("الساعة")}
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value || "20:00")}
                className="min-h-10 rounded-xl border border-line-strong bg-transparent px-3 text-text"
              />
            </label>
            {/* إشعار على الجوال: الأسهل، ومش محتاج تقويم */}
            <button
              type="button"
              disabled={pushBusy}
              onClick={async () => {
                setPushBusy(true);
                setPushMsg("");
                try {
                  const state = await enableWirdReminder(time);
                  if (state === "on") setPushTime(time);
                  else if (state === "denied") setPushMsg(t("الإشعارات محظورة من إعدادات المتصفح."));
                  else if (state === "needs-install") setPushMsg(t("على الآيفون: ثبّت الموقع على الشاشة الرئيسية أولًا، ثم افتحه من الأيقونة."));
                  else if (state === "unsupported") setPushMsg(t("متصفحك لا يدعم الإشعارات، استخدم التقويم."));
                } catch {
                  setPushMsg(t("تعذّر تفعيل الإشعار الآن."));
                } finally {
                  setPushBusy(false);
                }
              }}
              className="min-h-10 rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink hover:bg-accent-hover disabled:opacity-60"
            >
              {pushBusy ? t("جارٍ التفعيل…") : pushTime ? t("تغيير الساعة") : t("إشعار على الجوال")}
            </button>
            {pushTime && (
              <button
                type="button"
                onClick={async () => {
                  await disableWirdReminder();
                  setPushTime(null);
                }}
                className="min-h-10 px-2 text-sm text-muted hover:text-text"
              >
                
                {t("إيقاف الإشعار")}
              </button>
            )}
            <a
              href={wirdGoogleUrl(localToday(), w.daysLeft, time, siteUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center rounded-full bg-fg/5 px-4 text-sm hover:bg-fg/10"
            >
              
              {t("تقويم Google")}
            </a>
            <button type="button" onClick={downloadIcs} className="min-h-10 rounded-full bg-fg/5 px-4 text-sm hover:bg-fg/10">
              
              {t("تقويم الجهاز")}
            </button>
            {pushMsg && <p className="w-full text-sm text-[#E5636B]">{pushMsg}</p>}
          </div>
        </details>

        <button
          type="button"
          onClick={async () => {
            if (await ask(t("إيقاف خطة الورد؟ تقدّم الختمة سيبقى محفوظًا."), { confirm: t("إيقاف") })) w.stop();
          }}
          className="ms-auto text-sm text-muted underline-offset-4 hover:text-text hover:underline"
        >
          
          {t("إيقاف الخطة")}
        </button>
      </div>
    </section>
  );
}
/** مشاركة عدد الختمات: نص ورابط الموقع، من قايمة المشاركة في الموبايل أو نسخ */
async function shareKhatma(n: number, { t, toArabicDigits, en }: L) {
  const ordinal = en
    ? n === 1 ? "" : ` (${n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`} time)`
    : ["الأولى", "الثانية", "الثالثة", "الرابعة", "الخامسة", "السادسة", "السابعة", "الثامنة", "التاسعة", "العاشرة"][n - 1];
  const text = en
    ? `Alhamdulillah, I completed listening to the whole Quran${ordinal} in the voice of Sheikh Yasser Al-Dosari`
    : `الحمد لله، أتممت ختم القرآن الكريم ${ordinal ? `للمرة ${ordinal}` : `${toArabicDigits(n)} مرة`} استماعًا بصوت الشيخ ياسر الدوسري`;
  const url = `${window.location.origin}${en ? "/en" : ""}`;
  if (navigator.share) {
    try {
      await navigator.share({ text, url });
    } catch {
      /* المستخدم لغى */
    }
  } else {
    await navigator.clipboard?.writeText(`${text}\n${url}`);
    window.alert(t("تم نسخ الرسالة، الصقها حيث تريد."));
  }
}

function FlameIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M12 2c1 3.5-1.5 5-1.5 7.5 0 1.4 1 2.5 2.4 2.5 1.6 0 2.6-1.3 2.6-3 2 1.6 3.5 4.2 3.5 7A7 7 0 0 1 12 23a7 7 0 0 1-7-7c0-5 4-7 7-14z" />
    </svg>
  );
}

/** "يومان متتاليان" / "٥ أيام متتالية" / "١٢ يومًا متتاليًا" */
function streakLabel(n: number, { toArabicDigits, en }: L) {
  if (en) return `${n}-day streak`;
  if (n === 2) return "يومان متتاليان";
  if (n <= 10) return `${toArabicDigits(n)} أيام متتالية`;
  return `${toArabicDigits(n)} يومًا متتاليًا`;
}
