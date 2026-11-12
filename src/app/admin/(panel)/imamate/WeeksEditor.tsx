"use client";

import { useMemo, useState, useTransition } from "react";
import type { ImamatePrayer, ImamateWeek } from "@/types";
import { IMAMATE_PRAYER_LABELS, addDays, hijriDayLabel, hijriOf, hijriToIso, prayersList } from "@/lib/imamate";
import { saveWeeks, type ActionResult } from "../../actions";
import { MONTHS, WEEK_PRAYERS, hijriIso, labelOf, notifyLink, pad, shortLabel } from "./shared";

/** دور الشيخ في الصلاة: إمام، أو احتياطي، أو مفيش */
type Role = "imam" | "backup" | undefined;
const nextRole = (r: Role): Role => (r === undefined ? "imam" : r === "imam" ? "backup" : undefined);
const roleOf = (w: Pick<ImamateWeek, "prayers" | "backup">, p: ImamatePrayer): Role =>
  w.prayers.includes(p) ? "imam" : w.backup?.includes(p) ? "backup" : undefined;
function withRole(w: ImamateWeek, p: ImamatePrayer, r: Role): ImamateWeek {
  const prayers = WEEK_PRAYERS.filter((q) => (q === p ? r === "imam" : w.prayers.includes(q)));
  const backup = WEEK_PRAYERS.filter((q) => (q === p ? r === "backup" : (w.backup ?? []).includes(q)));
  return { from: w.from, prayers, ...(backup.length && { backup }) };
}

function RoleChip({ prayer, role, onClick }: { prayer: ImamatePrayer; role: Role; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="اضغط للتبديل: إمام ← احتياطي ← بدون"
      className={`min-h-10 rounded-full px-4 text-sm font-semibold transition-colors ${
        role === "imam" ? "bg-accent text-accent-ink" : role === "backup" ? "border border-dashed border-gold text-gold-soft" : "border border-line-strong text-muted hover:text-text"
      }`}
    >
      {IMAMATE_PRAYER_LABELS[prayer]}
      {role === "backup" && " (احتياطي)"}
    </button>
  );
}

/** نص إشعار الأسبوع: الصلوات والأيام */
function weekNotice(w: ImamateWeek) {
  const iso = hijriIso(w.from);
  const lastHijri = iso ? hijriOf(new Date(`${addDays(iso, 6)}T12:00:00Z`)) : null;
  const to = lastHijri ? `${lastHijri.d.toLocaleString("ar-EG")} ${MONTHS[lastHijri.m - 1]}` : "";
  const main = w.prayers.length ? `يؤم صلاة ${prayersList(w.prayers)}` : "";
  const backup = w.backup?.length ? `واحتياطي في ${prayersList(w.backup)}` : "";
  return {
    title: "جدول إمامة الشيخ هذا الأسبوع",
    body: [main, backup].filter(Boolean).join("، ") + ` بالمسجد الحرام، من ${shortLabel(w.from)} إلى ${to}.`,
  };
}

export function WeeksEditor({ initial }: { initial: ImamateWeek[] }) {
  const today = useMemo(() => hijriOf(new Date()), []);
  const [weeks, setWeeks] = useState(() => [...initial].sort((a, b) => b.from.localeCompare(a.from)));
  const [y, setY] = useState(today.y);
  const [m, setM] = useState(today.m);
  const [d, setD] = useState(today.d);
  const [draft, setDraft] = useState<ImamateWeek>({ from: "", prayers: [] });
  const [dirty, setDirty] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const iso = hijriToIso(y, m, d);
  const isSunday = iso ? new Date(`${iso}T12:00:00Z`).getUTCDay() === 0 : false;
  const from = `${y}-${pad(m)}-${pad(d)}`;
  const exists = weeks.some((w) => w.from === from);
  const draftEmpty = !draft.prayers.length && !draft.backup?.length;

  const update = (next: ImamateWeek[]) => {
    setWeeks([...next].sort((a, b) => b.from.localeCompare(a.from)));
    setDirty(true);
    setResult(null);
  };

  const add = () => {
    if (!iso || draftEmpty) return;
    update([...weeks.filter((w) => w.from !== from), { ...draft, from }]);
    setLastAdded(from);
    setDraft({ from: "", prayers: [] });
  };

  const save = () =>
    startSaving(async () => {
      const r = await saveWeeks(weeks);
      setResult(r);
      if (r.ok) setDirty(false);
    });

  const select = "min-h-11 rounded-xl border border-line-strong bg-ink px-3 text-text";
  const noticeWeek = weeks.find((w) => w.from === lastAdded) ?? null;

  return (
    <div className="flex flex-col gap-8">
      <section className="glass-card flex flex-col gap-4 rounded-3xl p-5">
        <h2 className="font-display text-2xl font-bold text-gold-soft">إضافة أسبوع</h2>
        <div className="flex flex-wrap items-end gap-3 text-sm">
          <label className="flex flex-col gap-1">
            اليوم
            <select value={d} onChange={(e) => setD(+e.target.value)} className={select}>
              {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            الشهر
            <select value={m} onChange={(e) => setM(+e.target.value)} className={select}>
              {MONTHS.map((name, i) => (
                <option key={name} value={i + 1}>{name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            السنة
            <input type="number" value={y} onChange={(e) => setY(+e.target.value)} className={`${select} w-28`} />
          </label>
        </div>
        <p className={`text-sm ${iso && isSunday ? "text-muted" : "text-gold-soft"}`}>
          {!iso ? "تاريخ غير صحيح" : `${hijriDayLabel(iso)} · ${iso}${isSunday ? "" : " — تنبيه: الأسبوع عادةً يبدأ يوم الأحد"}`}
        </p>
        <p className="text-xs text-muted">اضغط على الصلاة للتبديل: إمام ← احتياطي ← بدون. ظهر يوم الجمعة لا يُحسب، لأن الجمعة لها جدول منفصل تحت.</p>
        <div className="flex flex-wrap gap-2">
          {WEEK_PRAYERS.map((p) => (
            <RoleChip key={p} prayer={p} role={roleOf(draft, p)} onClick={() => setDraft(withRole(draft, p, nextRole(roleOf(draft, p))))} />
          ))}
        </div>
        <button
          type="button"
          onClick={add}
          disabled={!iso || draftEmpty}
          className="min-h-11 self-start rounded-full border border-gold/50 px-5 text-sm font-semibold text-gold-soft hover:bg-gold/10 disabled:opacity-40"
        >
          {exists ? "استبدال هذا الأسبوع" : "إضافة للقائمة"}
        </button>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl font-bold text-gold-soft">الأسابيع ({weeks.length})</h2>
        {weeks.length === 0 && <p className="text-muted">لا توجد أسابيع بعد.</p>}
        <ul className="flex flex-col gap-2">
          {weeks.map((w) => (
            <li key={w.from} className="flex flex-col gap-3 rounded-2xl border border-line p-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-semibold">{labelOf(w.from)}</span>
              <div className="flex flex-wrap items-center gap-2">
                {WEEK_PRAYERS.map((p) => (
                  <RoleChip
                    key={p}
                    prayer={p}
                    role={roleOf(w, p)}
                    onClick={() =>
                      update(
                        weeks
                          .map((x) => (x.from === w.from ? withRole(x, p, nextRole(roleOf(x, p))) : x))
                          .filter((x) => x.prayers.length || x.backup?.length),
                      )
                    }
                  />
                ))}
                <button
                  type="button"
                  onClick={() => window.confirm("حذف هذا الأسبوع؟") && update(weeks.filter((x) => x.from !== w.from))}
                  className="min-h-10 px-3 text-sm text-[#E5636B] hover:underline"
                >
                  حذف
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="sticky bottom-24 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-ink/95 p-3 backdrop-blur">
        <button type="button" onClick={save} disabled={saving} className="min-h-12 rounded-full bg-accent px-8 font-semibold text-accent-ink hover:bg-accent-hover disabled:opacity-50">
          {saving ? "جارٍ الحفظ…" : "حفظ"}
        </button>
        {dirty && !result && <span className="text-sm text-gold-soft">توجد تعديلات لم تُحفظ بعد</span>}
        {result && <span className={`text-sm ${result.ok ? "text-gold-soft" : "text-[#E5636B]"}`}>{result.message}</span>}
        {/* بعد حفظ أسبوع جديد: إشعار الجدول بضغطة */}
        {result?.ok && noticeWeek && (
          <a href={notifyLink(weekNotice(noticeWeek).title, weekNotice(noticeWeek).body)} className="text-sm font-semibold text-gold-soft underline-offset-4 hover:underline">
            أرسل إشعارًا بالجدول الجديد
          </a>
        )}
      </div>
    </div>
  );
}
