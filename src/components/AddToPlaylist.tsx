"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Recording } from "@/types";
import { usePlaylists } from "@/lib/usePlaylists";

/** زرار "أضف إلى قائمة": بيفتح قايمة بقوائم الزائر، وكل واحدة عليها علامة لو التسجيل فيها */
export function AddToPlaylist({ recording }: { recording: Recording }) {
  const pl = usePlaylists();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const box = useRef<HTMLDivElement>(null);

  // الضغط برّه القايمة بيقفلها
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const inCount = pl.lists.filter((p) => p.items.some((r) => r.id === recording.id)).length;

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="إضافة إلى قائمة تشغيل"
        title="إضافة إلى قائمة تشغيل"
        className={`glass-card flex h-14 w-14 items-center justify-center rounded-full transition-colors ${inCount ? "text-gold" : "text-muted hover:text-text"}`}
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M4 6h12M4 11h12M4 16h7M17 14v6M14 17h6" />
        </svg>
      </button>

      {open && (
        <div className="glass absolute end-0 top-full z-30 mt-2 flex w-72 flex-col gap-2 rounded-2xl border border-fg/10 p-3 shadow-float">
          <p className="px-1 text-sm font-semibold text-gold-soft">إضافة إلى قائمة</p>
          {pl.lists.length > 0 && (
            <ul className="flex max-h-60 flex-col gap-1 overflow-y-auto">
              {pl.lists.map((p) => {
                const has = p.items.some((r) => r.id === recording.id);
                return (
                  <li key={p.id}>
                    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 hover:bg-fg/5">
                      <input type="checkbox" checked={has} onChange={() => pl.toggleItem(p.id, recording)} className="h-5 w-5 accent-[#CDAA62]" />
                      <span className="min-w-0 flex-1 truncate">{p.name}</span>
                      <span className="text-xs text-muted">{p.items.length}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              pl.create(name, recording);
              setName("");
            }}
            className="flex gap-2 border-t border-fg/10 pt-2"
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="قائمة جديدة، مثلًا: قيام الليل"
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-line-strong bg-ink px-3 text-sm text-text"
            />
            <button type="submit" disabled={!name.trim()} className="min-h-11 rounded-xl bg-accent px-3 text-sm font-semibold text-accent-ink disabled:opacity-40">
              إنشاء
            </button>
          </form>
          <Link href="/playlists" className="px-1 text-sm text-gold-soft underline-offset-4 hover:underline">
            كل قوائمي
          </Link>
        </div>
      )}
    </div>
  );
}
