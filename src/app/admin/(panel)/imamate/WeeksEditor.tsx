"use client";

import { useMemo, useState, useTransition } from "react";
import type { ImamatePrayer, ImamateWeek } from "@/types";
import { IMAMATE_PRAYER_LABELS, hijriDayLabel, hijriOf, hijriToIso } from "@/lib/imamate";
import { saveWeeks, type ActionResult } from "../../actions";

const PRAYERS: ImamatePrayer[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
const MONTHS = ["محرم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"];
const pad = (n: number) => String(n).padStart(2, "0");

export function WeeksEditor({ initial }: { initial: ImamateWeek[] }) {
  const today = useMemo(() => hijriOf(new Date()), []);
  const [weeks, setWeeks] = useState(() => [...initial].sort((a, b) => b.from.localeCompare(a.from)));
  const [y, setY] = useState(today.y);
  const [m, setM] = useState(today.m);
  const [d, setD] = useState(today.d);
  const [picked, setPicked] = useState<ImamatePrayer[]>([]);
  const [dirty, setDirty] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [saving, startSaving] = useTransition();

  const iso = hijriToIso(y, m, d);
  const isSunday = iso ? new Date(`${iso}T12:00:00Z`).getUTCDay() === 0 : false;
  const from = `${y}-${pad(m)}-${pad(d)}`;
  const exists = weeks.some((w) => w.from === from);

  const update = (next: ImamateWeek[]) => {
    setWeeks([...next].sort((a, b) => b.from.localeCompare(a.from)));
    setDirty(true);
    setResult(null);
  };
  const toggle = (list: ImamatePrayer[], p: ImamatePrayer) => (list.includes(p) ? list.filter((x) => x !== p) : [...list, p]);
  const label = (w: ImamateWeek) => {
    const [yy, mm, dd] = w.from.split("-").map(Number);
    const g = hijriToIso(yy, mm, dd);
    return g ? hijriDayLabel(g) : w.from;
  };

  const add = () => {
    if (!iso || picked.length === 0) return;
    update([...weeks.filter((w) => w.from !== from), { from, prayers: PRAYERS.filter((p) => picked.includes(p)) }]);
    setPicked([]);
  };

  const save = () =>
    startSaving(async () => {
      const r = await saveWeeks(weeks);
      setResult(r);
      if (r.ok) setDirty(false);
    });

  const select = "min-h-11 rounded-xl border border-line-strong bg-ink px-3 text-text";
  const chip = (on: boolean) =>
    `min-h-10 rounded-full px-4 text-sm font-semibold transition-colors ${on ? "bg-gold text-gold-ink" : "border border-line-strong text-muted hover:text-text"}`;

  return (
    <div className="flex flex-col gap-8">
      {/* إضافة أسبوع */}
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
        <div className="flex flex-wrap gap-2">
          {PRAYERS.map((p) => (
            <button key={p} type="button" aria-pressed={picked.includes(p)} onClick={() => setPicked(toggle(picked, p))} className={chip(picked.includes(p))}>
              {IMAMATE_PRAYER_LABELS[p]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={add}
          disabled={!iso || picked.length === 0}
          className="min-h-11 self-start rounded-full border border-gold/50 px-5 text-sm font-semibold text-gold-soft hover:bg-gold/10 disabled:opacity-40"
        >
          {exists ? "استبدال هذا الأسبوع" : "إضافة للقائمة"}
        </button>
      </section>

      {/* الأسابيع */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl font-bold text-gold-soft">الأسابيع ({weeks.length})</h2>
        {weeks.length === 0 && <p className="text-muted">لا توجد أسابيع بعد.</p>}
        <ul className="flex flex-col gap-2">
          {weeks.map((w) => (
            <li key={w.from} className="flex flex-col gap-3 rounded-2xl border border-line p-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-semibold">{label(w)}</span>
              <div className="flex flex-wrap items-center gap-2">
                {PRAYERS.map((p) => {
                  const on = w.prayers.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      aria-pressed={on}
                      onClick={() => update(weeks.map((x) => (x.from === w.from ? { ...x, prayers: PRAYERS.filter((q) => toggle(x.prayers, p).includes(q)) } : x)).filter((x) => x.prayers.length))}
                      className={chip(on)}
                    >
                      {IMAMATE_PRAYER_LABELS[p]}
                    </button>
                  );
                })}
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

      {/* الحفظ */}
      <div className="sticky bottom-24 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-ink/95 p-3 backdrop-blur">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="min-h-12 rounded-full bg-gold px-8 font-semibold text-gold-ink hover:bg-gold-soft disabled:opacity-50"
        >
          {saving ? "جارٍ الحفظ…" : "حفظ"}
        </button>
        {dirty && !result && <span className="text-sm text-gold-soft">توجد تعديلات لم تُحفظ بعد</span>}
        {result && <span className={`text-sm ${result.ok ? "text-gold-soft" : "text-[#E5636B]"}`}>{result.message}</span>}
      </div>
    </div>
  );
}
