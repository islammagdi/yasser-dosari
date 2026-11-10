"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDuration } from "@/lib/format";
import { usePlaylists, type Playlist } from "@/lib/usePlaylists";
import { usePlayer } from "./PlayerProvider";
import { RecordingCover } from "./RecordingCover";
import { PauseIcon, PlayIcon } from "./icons";

/** صفحة قوائم التشغيل: كل قائمة بتتفتح وتتشغّل وتترتّب وتتعدّل */
export function PlaylistsView() {
  const pl = usePlaylists();
  const [name, setName] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">قوائم التشغيل</h1>
        <p className="text-lg text-muted">رتّب التلاوات التي تحبها في قوائم، مثل «قيام الليل» أو «تلاوات مؤثرة». القوائم محفوظة على جهازك.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          setOpenId(pl.create(name));
          setName("");
        }}
        className="flex max-w-lg gap-2"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="اسم القائمة الجديدة"
          className="min-h-12 min-w-0 flex-1 rounded-full border border-line-strong bg-ink px-5 text-text"
        />
        <button type="submit" disabled={!name.trim()} className="min-h-12 rounded-full bg-gold px-6 font-semibold text-gold-ink hover:bg-gold-soft disabled:opacity-40">
          إنشاء
        </button>
      </form>

      {pl.ready && pl.lists.length === 0 && (
        <p className="rounded-3xl border border-dashed border-line-strong px-6 py-12 text-center leading-8 text-muted">
          لا توجد قوائم بعد. أنشئ قائمة من هنا، أو افتح أي تلاوة واضغط زر «إضافة إلى قائمة».
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {pl.lists.map((p) => (
          <PlaylistItem key={p.id} p={p} open={openId === p.id} onToggle={() => setOpenId(openId === p.id ? null : p.id)} />
        ))}
      </ul>
    </div>
  );
}

function PlaylistItem({ p, open, onToggle }: { p: Playlist; open: boolean; onToggle: () => void }) {
  const pl = usePlaylists();
  const player = usePlayer();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(p.name);
  const total = p.items.reduce((s, r) => s + (r.durationSec ?? 0), 0);
  const playingHere = player.isPlaying && p.items.some((r) => r.id === player.current?.id);

  return (
    <li className="glass-card flex flex-col gap-3 rounded-3xl p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => p.items.length && player.playQueue(p.items, 0)}
          disabled={!p.items.length}
          aria-label={`تشغيل ${p.name}`}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold text-gold-ink hover:bg-gold-soft disabled:opacity-40"
        >
          {playingHere ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
        </button>
        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              pl.rename(p.id, name);
              setEditing(false);
            }}
            className="flex min-w-0 flex-1 gap-2"
          >
            <input value={name} onChange={(e) => setName(e.target.value)} autoFocus className="min-h-11 min-w-0 flex-1 rounded-xl border border-line-strong bg-ink px-3 text-text" />
            <button type="submit" className="min-h-11 rounded-xl bg-gold px-3 text-sm font-semibold text-gold-ink">حفظ</button>
          </form>
        ) : (
          <button type="button" onClick={onToggle} aria-expanded={open} className="flex min-w-0 flex-1 flex-col text-start">
            <span className="truncate font-display text-2xl font-bold">{p.name}</span>
            <span className="text-sm text-muted">
              {p.items.length} تلاوة{total ? ` · ${formatDuration(total)}` : ""}
            </span>
          </button>
        )}
      </div>

      {open && (
        <div className="flex flex-col gap-3 border-t border-line pt-3">
          {p.items.length === 0 ? (
            <p className="text-sm text-muted">القائمة فارغة. افتح أي تلاوة واضغط زر «إضافة إلى قائمة».</p>
          ) : (
            <ol className="flex flex-col gap-1">
              {p.items.map((r, i) => (
                <li key={r.id} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-white/5">
                  <button type="button" onClick={() => player.playQueue(p.items, i)} aria-label={`تشغيل ${r.title}`} className="shrink-0">
                    <RecordingCover recording={r} sizes="48px" className="h-12 w-12 rounded-xl" />
                  </button>
                  <Link href={`/${r.category}/${r.id}`} className="flex min-w-0 flex-1 flex-col">
                    <span className={`truncate font-semibold ${player.current?.id === r.id ? "text-gold-soft" : ""}`}>{r.title || r.prayerLabel}</span>
                    {r.subtitle && <span className="truncate text-sm text-muted">{r.subtitle}</span>}
                  </Link>
                  <div className="flex shrink-0 items-center">
                    <button type="button" onClick={() => pl.move(p.id, i, -1)} disabled={i === 0} aria-label="تحريك لأعلى" className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:text-text disabled:opacity-30">
                      ↑
                    </button>
                    <button type="button" onClick={() => pl.move(p.id, i, 1)} disabled={i === p.items.length - 1} aria-label="تحريك لأسفل" className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:text-text disabled:opacity-30">
                      ↓
                    </button>
                    <button type="button" onClick={() => pl.removeItem(p.id, r.id)} aria-label={`إزالة ${r.title} من القائمة`} className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:text-[#E5636B]">
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
          <div className="flex flex-wrap gap-3 text-sm">
            <button type="button" onClick={() => setEditing(true)} className="min-h-10 text-gold-soft hover:underline">
              تغيير الاسم
            </button>
            <button
              type="button"
              onClick={() => window.confirm(`حذف قائمة «${p.name}»؟`) && pl.remove(p.id)}
              className="min-h-10 text-[#E5636B] hover:underline"
            >
              حذف القائمة
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
