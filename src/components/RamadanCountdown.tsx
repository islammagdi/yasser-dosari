"use client";

import Link from "next/link";
import { toArabicDigits } from "@/lib/format";
import { daysFromToday, hijriOf, hijriToIso } from "@/lib/imamate";

const MONTHS_SHORT = ["محرم", "صفر", "ربيع ١", "ربيع ٢", "جمادى ١", "جمادى ٢", "رجب", "شعبان", "رمضان"];

/** هلال صغير: مليان للشهر الحالي ورمضان، دايرة فاضية للباقي */
function Moon({ state }: { state: "past" | "now" | "future" | "ramadan" }) {
  const stroke = state === "past" ? "rgb(241 238 230 / .35)" : state === "future" ? "rgb(241 238 230 / .15)" : "#E7CD94";
  const big = state === "ramadan";
  return (
    <svg aria-hidden viewBox="0 0 40 40" className={big ? "h-9 w-9" : "h-7 w-7"}>
      <circle cx="20" cy="20" r={big ? 17 : 14} fill="none" stroke={stroke} strokeWidth="1.5" />
      {(state === "now" || big) && <path d="M24 8a12 12 0 1 0 8 20A10 10 0 1 1 24 8Z" fill={big ? "#E7CD94" : "#CDAA62"} />}
    </svg>
  );
}

/**
 * قبل رمضان بأكتر من شهر (أو لما الجدول لسه متعلنش): عدّاد للأيام، وصف الشهور لحد رمضان.
 * بيتعرض بدل RamadanCard لما الكارت ده مش ظاهر.
 */
export function RamadanCountdown({ now }: { now: Date }) {
  const h = hijriOf(now);
  if (h.m === 9) return null; // في رمضان نفسه RamadanCard هو اللي بيتكلم
  const year = h.m < 9 ? h.y : h.y + 1;
  const start = hijriToIso(year, 9, 1);
  if (!start) return null;
  const days = daysFromToday(start, now);
  if (days <= 0) return null;

  // الشهور لحد رمضان؛ لو احنا بعد رمضان بنبدأ من الشهر الحالي (شوال وما بعده)
  const months = h.m < 9 ? MONTHS_SHORT : [...["شوال", "ذو القعدة", "ذو الحجة"].slice(h.m - 10), ...MONTHS_SHORT];
  const currentIndex = h.m < 9 ? h.m - 1 : 0;

  return (
    <section
      aria-labelledby="ramadan-countdown-title"
      className="relative isolate overflow-hidden rounded-[30px] bg-gradient-to-l from-[#1E4A3C] to-[#10241D] p-6 text-[#F1EEE6] sm:p-9"
    >
      <span aria-hidden className="pattern-stars absolute inset-0 -z-10 opacity-[0.12]" />
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex max-w-xl flex-col gap-1.5">
          <p className="text-sm font-semibold text-[#E7CD94]">الموسم القادم</p>
          <h2 id="ramadan-countdown-title" className="font-display text-3xl font-bold leading-tight sm:text-4xl">
            رمضان {toArabicDigits(year)} هـ
          </h2>
          <p className="text-[15px] leading-7 text-[#A9B7AF]">
            جدول ليالي الشيخ في التراويح والتهجد هيظهر هنا أول ما يتعلن، ومعاه تذكير قبل كل ليلة.
          </p>
          <Link href="/taraweeh" className="mt-2 self-start text-sm font-semibold text-[#E7CD94] underline-offset-4 hover:underline">
            اسمع ليالي رمضان اللي فاتت
          </Link>
        </div>
        <div className="flex shrink-0 items-end gap-3 sm:flex-col sm:items-center sm:gap-0">
          <span className="font-display text-7xl font-bold leading-none text-[#E7CD94] sm:text-8xl">{toArabicDigits(days)}</span>
          <span className="pb-2 text-sm text-[#A9B7AF] sm:pb-0">{days === 1 ? "يوم" : days <= 10 ? "أيام" : "يومًا"}</span>
        </div>
      </div>

      <ol className="mt-8 flex items-end justify-between gap-1 overflow-x-auto overflow-y-hidden pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="الشهور لحد رمضان">
        {months.map((m, i) => {
          const isRamadan = i === months.length - 1;
          const state = isRamadan ? "ramadan" : i < currentIndex ? "past" : i === currentIndex ? "now" : "future";
          return (
            <li key={m} className="flex min-w-[44px] flex-col items-center gap-2">
              <Moon state={state} />
              <span className={`whitespace-nowrap text-xs ${state === "now" || isRamadan ? "font-semibold text-[#E7CD94]" : "text-[#A9B7AF]"}`}>
                {m}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
