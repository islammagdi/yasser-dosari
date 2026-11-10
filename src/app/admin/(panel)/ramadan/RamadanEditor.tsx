"use client";

import { useMemo, useState, useTransition } from "react";
import type { NightPart, RamadanNight } from "@/types";
import { hijriOf } from "@/lib/imamate";
import { saveRamadanYear, type ActionResult } from "../../actions";

type Col = { prayer: RamadanNight["prayer"]; part: NightPart; label: string };
const COLS: Col[] = [
  { prayer: "taraweeh", part: "first", label: "تراويح: الأولى" },
  { prayer: "taraweeh", part: "last", label: "تراويح: الأخيرة والوتر" },
  { prayer: "tahajjud", part: "first", label: "تهجد: الأولى" },
  { prayer: "tahajjud", part: "last", label: "تهجد: الأخيرة والوتر" },
];
const key = (night: number, c: Pick<Col, "prayer" | "part">) => `${night}-${c.prayer}-${c.part}`;

export function RamadanEditor({ initial }: { initial: RamadanNight[] }) {
  // السنة الافتراضية: رمضان الجاي (أو الحالي لو إحنا فيه)
  const defaultYear = useMemo(() => {
    const h = hijriOf(new Date());
    return h.m > 9 ? h.y + 1 : h.y;
  }, []);
  const years = useMemo(
    () => [...new Set([defaultYear, defaultYear + 1, ...initial.map((n) => n.year)])].sort((a, b) => b - a),
    [initial, defaultYear],
  );
  const [year, setYear] = useState(defaultYear);
  const [all, setAll] = useState(initial);
  const [checked, setChecked] = useState(() => new Set(initial.filter((n) => n.year === defaultYear).map((n) => key(n.night, n))));
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(10);
  const [col, setCol] = useState(1);
  const [dirty, setDirty] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [saving, startSaving] = useTransition();

  const changeYear = (y: number) => {
    if (dirty && !window.confirm("توجد تعديلات لم تُحفظ على هذه السنة، وتغيير السنة سيلغيها. هل تريد المتابعة؟")) return;
    setYear(y);
    setChecked(new Set(all.filter((n) => n.year === y).map((n) => key(n.night, n))));
    setDirty(false);
    setResult(null);
  };

  const set = (next: Set<string>) => {
    setChecked(next);
    setDirty(true);
    setResult(null);
  };
  const toggle = (k: string) => {
    const next = new Set(checked);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    set(next);
  };
  const bulk = (on: boolean) => {
    const next = new Set(checked);
    for (let n = Math.min(from, to); n <= Math.max(from, to); n++) {
      const k = key(n, COLS[col]);
      if (on) next.add(k);
      else next.delete(k);
    }
    set(next);
  };

  const save = () =>
    startSaving(async () => {
      const nights: RamadanNight[] = [];
      for (let n = 1; n <= 30; n++) for (const c of COLS) if (checked.has(key(n, c))) nights.push({ year, night: n, prayer: c.prayer, part: c.part });
      const r = await saveRamadanYear(year, nights);
      setResult(r);
      if (r.ok) {
        setAll([...all.filter((x) => x.year !== year), ...nights]);
        setDirty(false);
      }
    });

  const select = "min-h-11 rounded-xl border border-line-strong bg-ink px-3 text-text";
  const nightsOpts = Array.from({ length: 30 }, (_, i) => i + 1);

  return (
    <div className="flex flex-col gap-6">
      <label className="flex items-center gap-3 text-sm">
        السنة
        <select value={year} onChange={(e) => changeYear(+e.target.value)} className={select}>
          {years.map((y) => (
            <option key={y} value={y}>{y} هـ</option>
          ))}
        </select>
      </label>

      {/* تعليم أكتر من ليلة مرة واحدة */}
      <section className="glass-card flex flex-wrap items-end gap-3 rounded-3xl p-5 text-sm">
        <span className="w-full font-semibold text-gold-soft">تعليم سريع</span>
        <label className="flex flex-col gap-1">
          من ليلة
          <select value={from} onChange={(e) => setFrom(+e.target.value)} className={select}>
            {nightsOpts.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          إلى ليلة
          <select value={to} onChange={(e) => setTo(+e.target.value)} className={select}>
            {nightsOpts.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          الجزء
          <select value={col} onChange={(e) => setCol(+e.target.value)} className={select}>
            {COLS.map((c, i) => <option key={c.label} value={i}>{c.label}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => bulk(true)} className="min-h-11 rounded-full border border-gold/50 px-4 font-semibold text-gold-soft hover:bg-gold/10">
          تعليم
        </button>
        <button type="button" onClick={() => bulk(false)} className="min-h-11 rounded-full px-4 text-muted hover:text-text">
          إلغاء التعليم
        </button>
      </section>

      {/* الجدول */}
      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="bg-white/5">
              <th className="p-3 text-start">الليلة</th>
              {COLS.map((c) => <th key={c.label} className="p-3 text-center font-semibold">{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {nightsOpts.map((n) => (
              <tr key={n} className="border-t border-line">
                <td className="p-3 font-semibold">ليلة {n}</td>
                {COLS.map((c) => {
                  const k = key(n, c);
                  return (
                    <td key={k} className="p-1 text-center">
                      <input
                        type="checkbox"
                        checked={checked.has(k)}
                        onChange={() => toggle(k)}
                        aria-label={`ليلة ${n}، ${c.label}`}
                        className="h-5 w-5 accent-[#CDAA62]"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sticky bottom-24 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-ink/95 p-3 backdrop-blur">
        <button type="button" onClick={save} disabled={saving} className="min-h-12 rounded-full bg-gold px-8 font-semibold text-gold-ink hover:bg-gold-soft disabled:opacity-50">
          {saving ? "جارٍ الحفظ…" : `حفظ رمضان ${year}`}
        </button>
        {dirty && !result && <span className="text-sm text-gold-soft">توجد تعديلات لم تُحفظ بعد</span>}
        {result && <span className={`text-sm ${result.ok ? "text-gold-soft" : "text-[#E5636B]"}`}>{result.message}</span>}
      </div>
    </div>
  );
}
