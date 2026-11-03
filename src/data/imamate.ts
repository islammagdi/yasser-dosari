import type { ImamateSlot } from "@/types";
import { makkahToday } from "@/lib/imamate";

/** جدول إمامة تجريبي: مواعيد بعد يومين وأربعة أيام من النهارده، عشان السكشن يبان دايمًا */
function plusDays(n: number): string {
  const [y, m, d] = makkahToday(new Date()).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export const MOCK_IMAMATE: ImamateSlot[] = [
  { id: "imamate-1", date: plusDays(2), prayer: "isha" },
  { id: "imamate-2", date: plusDays(4), prayer: "fajr" },
  { id: "imamate-3", date: plusDays(4), prayer: "maghrib" },
];