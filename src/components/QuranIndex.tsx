"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { SurahInfo } from "@/lib/api/quranText";
import { normalizeArabic, toArabicDigits } from "@/lib/format";
import { surahName } from "@/lib/quran";
import { JUZ_STARTS, readHref } from "@/lib/quranParts";
import { searchQuran, type AyahHit } from "@/lib/quranSearch";
import { useReading } from "@/lib/useReading";
import { SearchIcon } from "./icons";

type Tab = "surahs" | "juz";

/** فهرس القراءة: السور أو الأجزاء، وبحث في أسماء السور ونص الآيات، و"تابع القراءة" */
export function QuranIndex({ surahs }: { surahs: SurahInfo[] }) {
  const [tab, setTab] = useState<Tab>("surahs");
  const [q, setQ] = useState("");
  const { ready, last, bookmark } = useReading();

  const tabBtn = (t: Tab, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === t}
      onClick={() => setTab(t)}
      className={`min-h-11 flex-1 rounded-full px-5 text-[15px] transition-colors sm:flex-none ${
        tab === t ? "bg-gold font-semibold text-gold-ink" : "text-muted hover:bg-white/5 hover:text-text"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">القرآن الكريم</h1>
        <p className="text-muted">اقرأ المصحف بالرسم العثماني، بالسورة أو بالجزء.</p>
      </header>

      {ready && (bookmark || last) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {bookmark && (
            <ContinueCard
              href={readHref(bookmark.surah, bookmark.ayah)}
              label="علامتك"
              title={`سورة ${surahName(bookmark.surah)}، الآية ${toArabicDigits(bookmark.ayah)}`}
            />
          )}
          {last && last !== bookmark?.surah && (
            <ContinueCard href={readHref(last)} label="آخر سورة قرأتها" title={`سورة ${surahName(last)}`} />
          )}
        </div>
      )}

      <div role="tablist" aria-label="طريقة العرض" className="glass-card flex gap-1 self-start rounded-full p-1 max-sm:self-stretch">
        {tabBtn("surahs", "السور")}
        {tabBtn("juz", "الأجزاء")}
      </div>

      {tab === "surahs" ? <SurahsTab surahs={surahs} q={q} setQ={setQ} last={last} /> : <JuzTab />}

      <p className="text-xs text-muted">النص بالرسم العثماني من alquran.cloud، ونص البحث من موسوعة القرآن الكريم (quranenc.com).</p>
    </div>
  );
}

function ContinueCard({ href, label, title }: { href: string; label: string; title: string }) {
  return (
    <Link
      href={href}
      className="glass-card group flex min-h-16 items-center justify-between gap-4 rounded-3xl border border-gold/30 px-5 py-4 transition-colors hover:border-gold"
    >
      <span className="flex flex-col gap-0.5">
        <span className="text-xs text-muted">{label}</span>
        <span className="font-display text-xl font-bold text-gold-soft">{title}</span>
      </span>
      <span aria-hidden className="text-2xl text-gold transition-transform group-hover:-translate-x-1">←</span>
    </Link>
  );
}

function SurahsTab({ surahs, q, setQ, last }: { surahs: SurahInfo[]; q: string; setQ: (v: string) => void; last?: number }) {
  const list = useMemo(() => {
    const n = normalizeArabic(q);
    if (!n) return surahs;
    return surahs.filter((s) => normalizeArabic(s.name).includes(n) || String(s.n) === n);
  }, [q, surahs]);

  return (
    <div className="flex flex-col gap-6">
      <label className="glass-card flex min-h-12 items-center gap-3 rounded-full px-5">
        <SearchIcon className="h-5 w-5 shrink-0 text-muted" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="اسم سورة، أو كلمة من آية"
          aria-label="ابحث في السور والآيات"
          className="w-full bg-transparent py-3 text-base outline-none placeholder:text-muted"
        />
      </label>

      {list.length > 0 && (
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((s) => (
            <li key={s.n}>
              <Link
                href={`/quran/${s.n}`}
                className={`glass-card flex min-h-[72px] items-center gap-4 rounded-2xl px-4 py-3 transition-colors hover:border-gold/40 hover:bg-white/5 ${
                  last === s.n ? "border border-gold/40" : ""
                }`}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold/30 text-sm font-semibold text-gold-soft">
                  {toArabicDigits(s.n)}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-display text-xl font-bold">{s.name}</span>
                  {s.ayahs > 0 && (
                    <span className="text-xs text-muted">
                      {s.type ? `${s.type} · ` : ""}
                      {toArabicDigits(s.ayahs)} {s.ayahs >= 3 && s.ayahs <= 10 ? "آيات" : "آية"}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}

      <AyahResults q={q} noSurahs={list.length === 0} />
    </div>
  );
}

/** نتايج البحث في نص الآيات: بتبدأ بعد ٣ حروف، وبعد ما الزائر يقف عن الكتابة شوية */
function AyahResults({ q, noSurahs }: { q: string; noSurahs: boolean }) {
  const [state, setState] = useState<{ q: string; hits: AyahHit[]; total: number } | "loading" | "error" | null>(null);
  const query = q.trim();

  useEffect(() => {
    if (query.length < 3) {
      setState(null);
      return;
    }
    setState("loading");
    let alive = true;
    const t = window.setTimeout(() => {
      searchQuran(query)
        .then((r) => alive && setState({ q: query, ...r }))
        .catch(() => alive && setState("error"));
    }, 300);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [query]);

  if (!state) return noSurahs && query ? <p className="glass-card rounded-3xl px-6 py-10 text-center text-muted">مفيش سورة بالاسم ده.</p> : null;

  return (
    <section aria-label="نتائج البحث في الآيات" aria-live="polite" className="flex flex-col gap-4">
      <div className="flex items-center gap-4 px-1">
        <h2 className="font-display text-2xl font-bold text-gold-soft">في الآيات</h2>
        <span aria-hidden className="h-px flex-1 bg-gradient-to-l from-gold/30 to-transparent" />
        {typeof state === "object" && state.total > 0 && (
          <span className="text-sm text-muted">
            {toArabicDigits(state.total)} {state.total >= 3 && state.total <= 10 ? "آيات" : "آية"}
          </span>
        )}
      </div>

      {state === "loading" && <p className="text-sm text-muted">جارٍ البحث…</p>}
      {state === "error" && <p className="text-sm text-muted">تعذّر البحث الآن. حاول مرة أخرى.</p>}
      {typeof state === "object" && state.total === 0 && <p className="text-sm text-muted">مفيش آيات فيها «{state.q}».</p>}
      {typeof state === "object" && state.hits.length > 0 && (
        <ol className="flex flex-col gap-3">
          {state.hits.map((h) => (
            <li key={`${h.surah}:${h.ayah}`}>
              <Link
                href={readHref(h.surah, h.ayah)}
                className="glass-card flex flex-col gap-2 rounded-2xl px-5 py-4 transition-colors hover:border-gold/40 hover:bg-white/5"
              >
                <span className="text-xs font-semibold text-gold-soft">
                  سورة {surahName(h.surah)} · الآية {toArabicDigits(h.ayah)}
                </span>
                <span className="line-clamp-3 font-quran text-xl leading-[2]">{h.text}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
      {typeof state === "object" && state.total > state.hits.length && (
        <p className="text-sm text-muted">بيظهر أول {toArabicDigits(state.hits.length)} نتيجة. زوّد كلمة عشان تضيّق البحث.</p>
      )}
    </section>
  );
}

function JuzTab() {
  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {JUZ_STARTS.map(([s, a], i) => (
        <li key={i}>
          <Link
            href={readHref(s, a)}
            className="glass-card flex min-h-[72px] items-center gap-4 rounded-2xl px-4 py-3 transition-colors hover:border-gold/40 hover:bg-white/5"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold/30 text-sm font-semibold text-gold-soft">
              {toArabicDigits(i + 1)}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="font-display text-xl font-bold">الجزء {toArabicDigits(i + 1)}</span>
              <span className="text-xs text-muted">
                من سورة {surahName(s)}
                {a > 1 ? `، الآية ${toArabicDigits(a)}` : ""} · الحزبان {toArabicDigits(i * 2 + 1)} و{toArabicDigits(i * 2 + 2)}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}