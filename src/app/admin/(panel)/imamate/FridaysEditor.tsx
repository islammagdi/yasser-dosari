"use client";

import { useMemo, useState, useTransition } from "react";
import type { ImamateFriday } from "@/types";
import { hijriDayLabel, hijriOf, hijriToIso } from "@/lib/imamate";
import { saveFridays, type ActionResult } from "../../actions";
import { MONTHS, labelOf, notifyLink, pad, shortLabel } from "./shared";

/** جُمَع الشيخ: خطيب وإمام، أو احتياطي */
export function FridaysEditor({ initial }: { initial: ImamateFriday[] }) {
  const today = useMemo(() => hijriOf(new Date()), []);
  const [list, setList] = useState(() => [...initial].sort((a, b) => b.date.localeCompare(a.date)));
  const [y, setY] = useState(today.y);
  const [m, setM] = useState(today.m);
  const [d, setD] = useState(today.d);
  const [backup, setBackup] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [lastAdded, setLastAdded] = useState<ImamateFriday | null>(null);
  const [saving, startSaving] = useTransition();

  const iso = hijriToIso(y, m, d);
  const isFriday = iso ? new Date(`${iso}T12:00:00Z`).getUTCDay() === 5 : false;
  const date = `${y}-${pad(m)}-${pad(d)}`;

  const update = (next: ImamateFriday[]) => {
    setList([...next].sort((a, b) => b.date.localeCompare(a.date)));
    setDirty(true);
    setResult(null);
  };
  const add = () => {
    if (!iso || !isFriday) return;
    const f = { date, ...(backup && { backup: true }) };
    update([...list.filter((x) => x.date !== date), f]);
    setLastAdded(f);
  };
  const save = () =>
    startSaving(async () => {
      const r = await saveFridays(list);
      setResult(r);
      if (r.ok) setDirty(false);
    });

  const select = "min-h-11 rounded-xl border border-line-strong bg-ink px-3 text-text";

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-3xl font-bold">صلاة الجمعة</h2>
        <p className="text-muted">الجُمَع التي يخطب فيها الشيخ ويؤم الصلاة، أو يكون فيها احتياطيًا. تظهر في الرئيسية قبل الجمعة بأسبوع.</p>
      </div>

      <div className="glass-card flex flex-col gap-4 rounded-3xl p-5">
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
          <label className="flex flex-col gap-1">
            الدور
            <select value={backup ? "backup" : "imam"} onChange={(e) => setBackup(e.target.value === "backup")} className={select}>
              <option value="imam">خطيب وإمام</option>
              <option value="backup">احتياطي</option>
            </select>
          </label>
        </div>
        <p className={`text-sm ${iso && isFriday ? "text-muted" : "text-gold-soft"}`}>
          {!iso ? "تاريخ غير صحيح" : isFriday ? hijriDayLabel(iso) : `${hijriDayLabel(iso)} — هذا اليوم ليس جمعة`}
        </p>
        <button
          type="button"
          onClick={add}
          disabled={!iso || !isFriday}
          className="min-h-11 self-start rounded-full border border-gold/50 px-5 text-sm font-semibold text-gold-soft hover:bg-gold/10 disabled:opacity-40"
        >
          إضافة الجمعة
        </button>
      </div>

      {list.length > 0 && (
        <ul className="flex flex-col gap-2">
          {list.map((f) => (
            <li key={f.date} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line p-4 text-sm">
              <span className="font-semibold">
                {labelOf(f.date)} · <span className={f.backup ? "text-muted" : "text-gold-soft"}>{f.backup ? "احتياطي" : "خطيب وإمام"}</span>
              </span>
              <button type="button" onClick={() => update(list.filter((x) => x.date !== f.date))} className="min-h-10 px-3 text-[#E5636B] hover:underline">
                حذف
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={saving} className="min-h-12 rounded-full bg-accent px-8 font-semibold text-accent-ink hover:bg-accent-hover disabled:opacity-50">
          {saving ? "جارٍ الحفظ…" : "حفظ الجُمَع"}
        </button>
        {dirty && !result && <span className="text-sm text-gold-soft">توجد تعديلات لم تُحفظ بعد</span>}
        {result && <span className={`text-sm ${result.ok ? "text-gold-soft" : "text-[#E5636B]"}`}>{result.message}</span>}
        {result?.ok && lastAdded && !lastAdded.backup && (
          <a
            href={notifyLink("الشيخ يخطب الجمعة", `الشيخ ياسر الدوسري يخطب ويؤم صلاة الجمعة يوم ${shortLabel(lastAdded.date)} في المسجد الحرام.`)}
            className="text-sm font-semibold text-gold-soft underline-offset-4 hover:underline"
          >
            أرسل إشعارًا بالجمعة
          </a>
        )}
      </div>
    </section>
  );
}
